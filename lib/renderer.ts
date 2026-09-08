import type { State } from './physics';
export function createRenderer(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('webgl2', {
    antialias: true,
    alpha: false,
  });
  if (!context)
    throw new Error(
      'WebGL2 is unavailable. Open this experiment in a browser with GPU acceleration enabled.',
    );
  const gl: WebGL2RenderingContext = context;
  const shader = (type: number, source: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      throw new Error(gl.getShaderInfoLog(s) || 'Shader compilation failed');
    return s;
  };
  const vs = shader(
    gl.VERTEX_SHADER,
    `#version 300 es
 in vec2 position; uniform vec2 scale; uniform float size; void main(){gl_Position=vec4(position*scale,0.,1.);gl_PointSize=size;}`,
  );
  const fs = shader(
    gl.FRAGMENT_SHADER,
    `#version 300 es
 precision highp float;uniform vec4 color;uniform bool point;out vec4 outColor;void main(){if(point&&distance(gl_PointCoord,vec2(.5))>.5)discard;outColor=color;}`,
  );
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(p) || 'Shader link failed');
  gl.useProgram(p);
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  const loc = gl.getAttribLocation(p, 'position');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const scale = gl.getUniformLocation(p, 'scale'),
    color = gl.getUniformLocation(p, 'color'),
    size = gl.getUniformLocation(p, 'size'),
    point = gl.getUniformLocation(p, 'point');
  function draw(data: number[], mode: number, c: number[], dot = 1) {
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
    gl.uniform4fv(color, c);
    gl.uniform1f(size, dot);
    gl.uniform1i(point, mode === gl.POINTS ? 1 : 0);
    gl.drawArrays(mode, 0, data.length / 2);
  }
  const circle = (r: number) =>
    Array.from({ length: 257 }, (_, i) => [
      r * Math.cos((i * Math.PI) / 128),
      r * Math.sin((i * Math.PI) / 128),
    ]).flat();
  return {
    render(states: State[], other: State[] | null, index: number) {
      const rect = canvas.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio, 2);
      const w = Math.round(rect.width * dpr),
        h = Math.round(rect.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0.021, 0.028, 0.041, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(
        scale,
        1 / (18 * Math.max(w / h, 1)),
        1 / (18 * Math.max(h / w, 1)),
      );
      for (const r of [4, 8, 12, 16])
        draw(circle(r), gl.LINE_STRIP, [0.12, 0.17, 0.22, 1]);
      draw([-18, 0, 18, 0, 0, -18, 0, 18], gl.LINES, [0.12, 0.17, 0.22, 1]);
      draw(circle(6), gl.LINE_STRIP, [0.26, 0.43, 0.54, 1]);
      draw(circle(3), gl.LINE_STRIP, [0.45, 0.36, 0.23, 1]);
      const disk = [0, 0, ...circle(2)];
      draw(disk, gl.TRIANGLE_FAN, [0, 0, 0, 1]);
      draw(circle(2), gl.LINE_STRIP, [0.7, 0.5, 0.27, 1]);
      const xy = (list: State[], end: number) =>
        list
          .slice(0, end + 1)
          .flatMap((s) => [s[0] * Math.cos(s[2]), s[0] * Math.sin(s[2])]);
      if (other)
        draw(
          xy(other, Math.min(index, other.length - 1)),
          gl.LINE_STRIP,
          [0.29, 0.65, 0.75, 1],
        );
      draw(xy(states, index), gl.LINE_STRIP, [1, 0.69, 0.32, 1]);
      const s = states[index];
      draw(
        [s[0] * Math.cos(s[2]), s[0] * Math.sin(s[2])],
        gl.POINTS,
        [1, 0.88, 0.65, 1],
        9 * dpr,
      );
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(p);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
