import { createRenderer, defaultView } from '../lib/renderer';
import { makeCamera, cameraRay } from '../lib/camera';
import { traceTransport } from '../lib/transport';
import { traceLight } from '../lib/light';
export async function runValidation(root: HTMLElement) {
  root.innerHTML =
    '<div style="padding:24px;background:#111;color:#eee;min-height:100vh"><h1>GPU validation</h1><pre id="report" style="white-space:pre-wrap">Running…</pre><canvas id="gpu" style="width:640px;height:360px;max-width:90vw"></canvas></div>';
  const report = document.getElementById('report')!,
    canvas = document.getElementById('gpu') as HTMLCanvasElement;
  const lines: string[] = [];
  let failures = 0;
  const log = (s: string) => {
    lines.push(s);
    report.textContent = lines.join('\n');
  };
  const check = (ok: boolean, s: string) => {
    if (!ok) failures++;
    log(`${ok ? 'PASS' : 'FAIL'} ${s}`);
  };
  try {
    const renderer = createRenderer(canvas);
    let total = 0,
      mismatch = 0,
      hitError = 0,
      shiftError = 0,
      directionError = 0,
      maxNull = 0,
      maxLz = 0,
      unresolved = 0;
    for (const a of [0, 0.6, -0.6, 0.9]) {
      const camera = makeCamera(30, 77, a),
        samples = [];
      for (const y of [-0.75, -0.35, 0, 0.35, 0.75])
        for (const x of [-1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2])
          samples.push(cameraRay(camera, x, y));
      const gpu = renderer.diagnose(samples, a);
      samples.forEach((ray, i) => {
        const cpu = traceTransport(ray.state, ray.pt, a),
          g = gpu.data.slice(i * 4, i * 4 + 4);
        total++;
        if (Math.round(g[3]) !== cpu.status) mismatch++;
        if (cpu.status === 3) unresolved++;
        if (cpu.status === 1 && Math.round(g[3]) === 1) {
          hitError = Math.max(
            hitError,
            Math.hypot(g[0] - cpu.data[0], g[1] - cpu.data[1]),
          );
          shiftError = Math.max(shiftError, Math.abs(g[2] - cpu.data[2]));
        }
        if (cpu.status === 2 && Math.round(g[3]) === 2)
          directionError = Math.max(
            directionError,
            Math.hypot(...cpu.data.map((v, j) => v - g[j])),
          );
        // Near-horizon coordinate momenta become large; track constraints for disk/escaped rays separately.
        if (cpu.status === 1 || cpu.status === 2) {
          maxNull = Math.max(maxNull, gpu.errors[i * 4]);
          maxLz = Math.max(maxLz, gpu.errors[i * 4 + 1]);
        }
      });
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    }
    check(
      mismatch === 0,
      `${total} CPU/GPU ray classifications; mismatches=${mismatch}, unresolved=${unresolved}`,
    );
    check(
      hitError < 0.01,
      `Max disk-hit position error=${hitError.toExponential(3)} M (limit 0.01)`,
    );
    check(
      shiftError < 0.002,
      `Max frequency-ratio error=${shiftError.toExponential(3)} (limit 0.002)`,
    );
    check(
      directionError < 0.001,
      `Max escape-direction vector error=${directionError.toExponential(3)} (limit 0.001)`,
    );
    check(
      maxNull < 0.002,
      `Max GPU normalized Hamiltonian residual, disk/escape=${maxNull.toExponential(3)} (limit 0.002)`,
    );
    check(
      maxLz < 0.002,
      `Max GPU axial momentum drift, disk/escape=${maxLz.toExponential(3)} (limit 0.002)`,
    );
    const camera = makeCamera(30, 77, 0);
    const critical = 3 * Math.sqrt(3);
    const bs = [critical * 0.98, critical * 1.02, 6, 8],
      rays = bs.map((b) => {
        const alpha = Math.asin((b * Math.sqrt(1 - 2 / 30)) / 30);
        return cameraRay(camera, Math.tan(alpha) / 0.38, 0);
      });
    const schwarz = renderer.diagnose(rays, 0, 1, false);
    check(
      bs.every(
        (b, i) =>
          Math.round(schwarz.data[i * 4 + 3]) ===
          (traceLight(b).status === 'captured' ? 0 : 2),
      ),
      'Spin-zero GPU capture agrees with independent planar Schwarzschild ODE',
    );
    const sample = cameraRay(makeCamera(30, 77, 0.6), 0.8, 0),
      coarse = renderer.diagnose([sample], 0.6),
      fine = renderer.diagnose([sample], 0.6, 0.5);
    const refinedDifference = Math.hypot(
      coarse.data[0] - fine.data[0],
      coarse.data[1] - fine.data[1],
    );
    check(
      refinedDifference < 0.005,
      `GPU disk-hit step refinement=${refinedDifference.toExponential(3)} M (limit 0.005)`,
    );
    const view = { ...defaultView, quality: 0.65 };
    let frame = 0,
      done = false;
    await new Promise<void>((resolve) => {
      const tick = () => {
        frame++;
        const stats = renderer.render(frame / 60, view);
        if (stats.progress === 1) {
          done = true;
          resolve();
        } else if (frame > 250) {
          resolve();
        } else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    check(done, 'Progressive view completes');
    const passes = renderer.stats.transportPasses;
    for (let i = 0; i < 60; i++) {
      renderer.render(1 + i / 60, { ...view, exposure: 1 + (i % 2) * 0.1 });
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    }
    check(
      renderer.stats.transportPasses === passes,
      `60 animation/exposure frames reuse transport (${passes} total initial transport passes)`,
    );
    renderer.render(2, { ...view, spin: 0.7 });
    check(
      renderer.stats.transportPasses === passes + 1,
      'Spin change invalidates cached transport',
    );
    const median = (v: number[]) => {
      const s = [...v].sort((a, b) => a - b);
      return s.length
        ? s[Math.floor(s.length * 0.5)].toFixed(3)
        : 'unavailable';
    };
    log(
      `Resolution ${renderer.stats.width}×${renderer.stats.height}; float targets ${(renderer.stats.floatBufferBytes / 1048576).toFixed(2)} MiB`,
    );
    log(
      `GPU timings (ms), transport-pass median ${median(renderer.stats.gpuTransportMs)}, shade+display median ${median(renderer.stats.gpuShadeMs)}`,
    );
    log(`Browser ${navigator.userAgent}`);
    log(failures ? `RESULT: FAIL (${failures})` : 'RESULT: PASS');
    renderer.dispose();
  } catch (e) {
    log(`RESULT: ERROR ${String(e)}`);
  }
}
