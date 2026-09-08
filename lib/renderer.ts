import { makeCamera, isco, type Camera } from './camera.ts';
import type { KerrState } from './kerr.ts';
import { fullscreenVertex, transportFragment } from './kerr-glsl.ts';
import { shadeFragment, displayFragment } from './shading-glsl.ts';
import { program, texture, target, removeTarget, type Target } from './gpu.ts';
export type View = {
  inclination: number;
  roll: number;
  exposure: number;
  distance: number;
  quality: number;
  spin: number;
  camera?: Camera;
  moving?: boolean;
};
export const defaultView: View = {
  inclination: 77,
  roll: -8,
  exposure: 1.35,
  distance: 30,
  quality: 0.8,
  spin: 0.6,
};
export type RenderStats = {
  transportPasses: number;
  cachedFrames: number;
  progress: number;
  gpuTransportMs: number[];
  gpuShadeMs: number[];
  width: number;
  height: number;
  floatBufferBytes: number;
};
export function createRenderer(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('webgl2', {
    antialias: false,
    alpha: false,
  });
  if (!context)
    throw new Error(
      'WebGL2 is unavailable. Enable GPU acceleration or use another browser.',
    );
  const gl: WebGL2RenderingContext = context;
  if (!gl.getExtension('EXT_color_buffer_float'))
    throw new Error(
      'This GPU does not expose floating-point render targets required by the Kerr renderer.',
    );
  const transport = program(gl, fullscreenVertex, transportFragment),
    shade = program(gl, fullscreenVertex, shadeFragment),
    display = program(gl, fullscreenVertex, displayFragment);
  const locate = (p: WebGLProgram, names: string[]) =>
    Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)]));
  const tu = locate(transport, [
    'resolution',
    'roll',
    'cameraPosition',
    'observer',
    'forwardBasis',
    'rightBasis',
    'upBasis',
    'spin',
    'innerRadius',
    'stepScale',
    'diagnostics',
    'includeDisk',
    'initialX',
    'initialP',
  ]);
  const su = locate(shade, [
    'resolution',
    'spin',
    'innerRadius',
    'time',
    'transportMap',
    'previewMap',
  ]);
  const du = locate(display, ['resolution', 'exposure', 'emission']);
  const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const pending: {
    query: WebGLQuery;
    kind: 'transport' | 'shade';
    pixels: number;
  }[] = [];
  let transportMsPerPixel = 0;
  const stats: RenderStats = {
    transportPasses: 0,
    cachedFrames: 0,
    progress: 0,
    gpuTransportMs: [],
    gpuShadeMs: [],
    width: 0,
    height: 0,
    floatBufferBytes: 0,
  };
  let low: Target | null = null,
    high: Target | null = null,
    hdr: Target | null = null,
    lastKey = '',
    row = 0;
  type Cached = { low: Target; high: Target; hdr: Target; row: number };
  const cache = new Map<string, Cached>();
  const cacheBudget = 32 * 1024 * 1024;
  const bytes = (entry: Cached) =>
    entry.low.w * entry.low.h * 16 + entry.high.w * entry.high.h * 24;
  const cacheBytes = () =>
    [...cache.values()].reduce((sum, entry) => sum + bytes(entry), 0);
  const free = (entry: Cached) => {
    removeTarget(gl, entry.low);
    removeTarget(gl, entry.high);
    removeTarget(gl, entry.hdr);
  };
  function bindTexture(unit: number, t: WebGLTexture) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
  }
  function timed(kind: 'transport' | 'shade', draw: () => void, pixels = 0) {
    if (!timer || pending.length > 12) {
      draw();
      return;
    }
    const q = gl.createQuery()!;
    gl.beginQuery(timer.TIME_ELAPSED_EXT, q);
    draw();
    gl.endQuery(timer.TIME_ELAPSED_EXT);
    pending.push({ query: q, kind, pixels });
  }
  function poll() {
    if (!timer) return;
    const disjoint = gl.getParameter(timer.GPU_DISJOINT_EXT);
    for (let i = pending.length - 1; i >= 0; i--) {
      const p = pending[i];
      if (gl.getQueryParameter(p.query, gl.QUERY_RESULT_AVAILABLE)) {
        if (!disjoint) {
          const list =
            p.kind === 'transport' ? stats.gpuTransportMs : stats.gpuShadeMs;
          const milliseconds =
            Number(gl.getQueryParameter(p.query, gl.QUERY_RESULT)) / 1e6;
          list.push(milliseconds);
          if (p.kind === 'transport' && p.pixels > 0) {
            const cost = milliseconds / p.pixels;
            transportMsPerPixel = transportMsPerPixel
              ? 0.75 * transportMsPerPixel + 0.25 * cost
              : cost;
          }
          if (list.length > 600) list.shift();
        }
        gl.deleteQuery(p.query);
        pending.splice(i, 1);
      } else if (disjoint) {
        gl.deleteQuery(p.query);
        pending.splice(i, 1);
      }
    }
  }
  function setTransport(view: View) {
    const camera =
      view.camera ?? makeCamera(view.distance, view.inclination, view.spin);
    gl.useProgram(transport);
    gl.uniform1f(tu.spin, view.spin);
    gl.uniform1f(tu.innerRadius, isco(view.spin));
    gl.uniform1f(tu.stepScale, view.camera ? 0.5 : 1);
    gl.uniform1i(tu.diagnostics, 0);
    gl.uniform1i(tu.includeDisk, 1);
    gl.uniform1i(tu.initialX, 3);
    gl.uniform1i(tu.initialP, 4);
    gl.uniform1f(tu.roll, (view.roll * Math.PI) / 180);
    gl.uniform3fv(tu.cameraPosition, camera.position);
    gl.uniform4fv(tu.observer, camera.observer);
    gl.uniform4fv(tu.forwardBasis, camera.forward);
    gl.uniform4fv(tu.rightBasis, camera.right);
    gl.uniform4fv(tu.upBasis, camera.up);
  }
  function render(time: number, view: View): RenderStats {
    if (gl.isContextLost())
      throw new Error(
        'GPU context was lost. Reload to restore the simulation.',
      );
    poll();
    const rect = canvas.getBoundingClientRect(),
      ratio = rect.width / Math.max(1, rect.height),
      longest = Math.max(rect.width, rect.height),
      scale =
        Math.min(1, (view.moving ? 960 : 1280) / Math.max(1, longest)) *
        view.quality;
    const w = Math.max(1, Math.round(rect.width * scale)),
      h = Math.max(1, Math.round(rect.height * scale));
    const key = [
      w,
      h,
      view.distance,
      view.inclination,
      view.roll,
      view.spin,
      ...(view.camera
        ? [
            ...view.camera.position,
            ...view.camera.observer,
            ...view.camera.forward,
          ]
        : []),
    ].join('/');
    if (key !== lastKey) {
      const preview =
        transportMsPerPixel > 0
          ? Math.max(
              224,
              Math.min(
                384,
                32 *
                  Math.floor(
                    Math.sqrt((16 / transportMsPerPixel) * ratio) / 32,
                  ),
              ),
            )
          : 320;
      const lw = Math.max(
          1,
          Math.round(Math.min(w, view.moving ? preview : 280)),
        ),
        lh = Math.max(1, Math.round(lw / ratio));
      if (low && high && hdr) cache.set(lastKey, { low, high, hdr, row });
      const existing = cache.get(key);
      cache.delete(key);
      if (existing) {
        ({ low, high, hdr, row } = existing);
        stats.cachedFrames++;
      } else {
        // Recycle an evicted allocation when dimensions agree; keep GPU memory bounded.
        let recycled: Cached | undefined;
        if (cacheBytes() >= cacheBudget && cache.size) {
          const oldest = cache.keys().next().value!;
          recycled = cache.get(oldest)!;
          cache.delete(oldest);
        }
        if (
          recycled &&
          recycled.low.w === lw &&
          recycled.low.h === lh &&
          recycled.high.w === w &&
          recycled.high.h === h
        ) {
          ({ low, high, hdr } = recycled);
        } else {
          if (recycled) free(recycled);
          low = target(gl, lw, lh);
          high = target(gl, w, h);
          hdr = target(gl, w, h, true);
        }
        gl.clearColor(0, 0, 0, -1);
        gl.bindFramebuffer(gl.FRAMEBUFFER, high.fbo);
        gl.clear(gl.COLOR_BUFFER_BIT);
        setTransport(view);
        gl.bindFramebuffer(gl.FRAMEBUFFER, low.fbo);
        gl.viewport(0, 0, lw, lh);
        gl.uniform2f(tu.resolution, lw, lh);
        timed('transport', () => gl.drawArrays(gl.TRIANGLES, 0, 3), lw * lh);
        stats.transportPasses++;
        row = 0;
      }
      while (cacheBytes() > cacheBudget && cache.size) {
        const oldest = cache.keys().next().value!;
        free(cache.get(oldest)!);
        cache.delete(oldest);
      }
      lastKey = key;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      stats.width = w;
      stats.height = h;
      stats.floatBufferBytes = lw * lh * 16 + w * h * 24 + cacheBytes();
    } else if (high && row < high.h) {
      setTransport(view);
      gl.bindFramebuffer(gl.FRAMEBUFFER, high.fbo);
      gl.viewport(0, 0, high.w, high.h);
      gl.uniform2f(tu.resolution, high.w, high.h);
      const pixels =
        transportMsPerPixel > 0
          ? Math.max(
              1024,
              Math.min(view.moving ? 16384 : 8192, 12 / transportMsPerPixel),
            )
          : view.moving
            ? 16384
            : 8192;
      const rows = Math.min(
        Math.max(1, Math.floor(pixels / high.w)),
        high.h - row,
      );
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(0, row, high.w, rows);
      timed(
        'transport',
        () => gl.drawArrays(gl.TRIANGLES, 0, 3),
        high.w * rows,
      );
      gl.disable(gl.SCISSOR_TEST);
      row += rows;
      stats.transportPasses++;
    } else stats.cachedFrames++;
    if (!low || !high || !hdr) return stats;
    stats.progress = row / high.h;
    timed('shade', () => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, hdr!.fbo);
      gl.viewport(0, 0, w, h);
      gl.useProgram(shade);
      bindTexture(0, high!.tex);
      bindTexture(1, low!.tex);
      gl.uniform1i(su.transportMap, 0);
      gl.uniform1i(su.previewMap, 1);
      gl.uniform2f(su.resolution, w, h);
      gl.uniform1f(su.spin, view.spin);
      gl.uniform1f(su.innerRadius, isco(view.spin));
      gl.uniform1f(su.time, time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(display);
      bindTexture(0, hdr!.tex);
      gl.uniform1i(du.emission, 0);
      gl.uniform2f(du.resolution, w, h);
      gl.uniform1f(du.exposure, view.exposure);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    });
    return stats;
  }
  function diagnose(
    rays: { state: KerrState; pt: number }[],
    a: number,
    stepScale = 1,
    includeDisk = true,
  ) {
    const n = rays.length,
      out = target(gl, n, 1),
      checks = texture(gl, n, 1),
      xs = new Float32Array(n * 4),
      ps = new Float32Array(n * 4);
    rays.forEach((r, i) => {
      xs.set([...r.state.slice(0, 3), r.pt], i * 4);
      ps.set([...r.state.slice(3), 0], i * 4);
    });
    const tx = texture(gl, n, 1, xs),
      tp = texture(gl, n, 1, ps);
    gl.bindFramebuffer(gl.FRAMEBUFFER, out.fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT1,
      gl.TEXTURE_2D,
      checks,
      0,
    );
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.viewport(0, 0, n, 1);
    gl.disable(gl.SCISSOR_TEST);
    gl.useProgram(transport);
    gl.uniform1i(tu.diagnostics, 1);
    gl.uniform1i(tu.includeDisk, includeDisk ? 1 : 0);
    gl.uniform1f(tu.spin, a);
    gl.uniform1f(tu.innerRadius, isco(a));
    gl.uniform1f(tu.stepScale, stepScale);
    bindTexture(3, tx);
    bindTexture(4, tp);
    gl.uniform1i(tu.initialX, 3);
    gl.uniform1i(tu.initialP, 4);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const data = new Float32Array(n * 4),
      errors = new Float32Array(n * 4);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.readPixels(0, 0, n, 1, gl.RGBA, gl.FLOAT, data);
    gl.readBuffer(gl.COLOR_ATTACHMENT1);
    gl.readPixels(0, 0, n, 1, gl.RGBA, gl.FLOAT, errors);
    const error = gl.getError();
    removeTarget(gl, out);
    gl.deleteTexture(checks);
    gl.deleteTexture(tx);
    gl.deleteTexture(tp);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (error !== gl.NO_ERROR) throw new Error(`GPU readback error ${error}`);
    return { data, errors };
  }
  return {
    render,
    diagnose,
    stats,
    dispose() {
      removeTarget(gl, low);
      removeTarget(gl, high);
      removeTarget(gl, hdr);
      cache.forEach(free);
      cache.clear();
      gl.deleteProgram(transport);
      gl.deleteProgram(shade);
      gl.deleteProgram(display);
      pending.forEach((p) => gl.deleteQuery(p.query));
    },
  };
}
