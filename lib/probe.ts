import { program } from './gpu.ts';
import { probePixelSpan } from './mission.ts';
export type Perspective = 'onboard' | 'beside' | 'wide' | 'optics';
type V = [number, number, number];
const metal: V = [0.31, 0.34, 0.36],
  foil: V = [0.55, 0.35, 0.13],
  dark: V = [0.035, 0.043, 0.05];
function geometry(cockpit: boolean) {
  const data: number[] = [];
  const triangle = (a: V, b: V, c: V, color: V) => {
    const u = b.map((v, i) => v - a[i]),
      v = c.map((q, i) => q - a[i]);
    const n = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
    const l = Math.hypot(...n) || 1;
    for (const p of [a, b, c])
      data.push(...p, ...n.map((q) => q / l), ...color);
  };
  const box = (center: V, size: V, color: V) => {
    const p: V[] = [];
    for (let i = 0; i < 8; i++)
      p.push(
        center.map((q, j) => q + (((i >> j) & 1 ? 1 : -1) * size[j]) / 2) as V,
      );
    for (const [a, b, c, d] of [
      [0, 4, 6, 2],
      [1, 3, 7, 5],
      [0, 1, 5, 4],
      [2, 6, 7, 3],
      [0, 2, 3, 1],
      [4, 5, 7, 6],
    ]) {
      triangle(p[a], p[b], p[c], color);
      triangle(p[a], p[c], p[d], color);
    }
  };
  if (cockpit) {
    box([0, -0.69, 1.55], [2.8, 0.43, 0.65], dark);
    box([0, -0.48, 1.48], [2.7, 0.045, 0.13], metal);
    box([-0.72, 0, 1.5], [0.1, 1.7, 0.16], metal);
    box([0.72, 0, 1.5], [0.1, 1.7, 0.16], metal);
    box([-0.81, 0, 1.53], [0.09, 1.7, 0.22], dark);
    box([0.81, 0, 1.53], [0.09, 1.7, 0.22], dark);
    box([0, 0.64, 1.5], [2.8, 0.16, 0.22], dark);
    for (let i = -6; i <= 6; i++)
      box([i * 0.16, -0.492, 1.39], [0.014, 0.014, 0.012], [0.55, 0.56, 0.53]);
  } else {
    box([0, 0, 0], [2, 1.8, 2.6], foil);
    box([0, 0.96, 0], [2.1, 0.12, 2.7], metal);
    box([0, -0.96, 0], [2.1, 0.12, 2.7], metal);
    box([0, 0, 0], [10, 0.065, 0.065], metal);
    box([-3.7, 0, 0], [2.1, 0.08, 2.4], dark);
    box([3.7, 0, 0], [2.1, 0.08, 2.4], dark);
    for (let i = 0; i < 8; i++)
      for (const sign of [-1, 1])
        box([sign * (2.8 + i * 0.25), -0.051, 0], [0.012, 0.012, 2.4], metal);
    box([0, 1.55, 0], [0.12, 1.2, 0.12], metal);
    // Parabolic dish, 2.6 m aperture, facing the local +y direction.
    for (let ring = 0; ring < 8; ring++)
      for (let j = 0; j < 48; j++) {
        const p = (r: number, a: number): V => [
          r * Math.cos(a),
          2.0 + 0.23 * r * r,
          r * Math.sin(a),
        ];
        const r = (1.3 * ring) / 8,
          R = (1.3 * (ring + 1)) / 8,
          a = (j * Math.PI) / 24,
          b = ((j + 1) * Math.PI) / 24;
        triangle(p(r, a), p(R, a), p(R, b), metal);
        triangle(p(r, a), p(R, b), p(r, b), metal);
      }
    box([0, 2.65, 0], [0.07, 1.1, 0.07], metal);
    box([0.4, 0, -1.45], [0.42, 0.42, 0.4], dark);
  }
  return new Float32Array(data);
}
export function createProbeRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
  });
  if (!gl) throw new Error('WebGL2 is required for the probe view.');
  const p = program(
    gl,
    `#version 300 es
 precision highp float;
 layout(location=0) in vec3 position;layout(location=1) in vec3 normal;layout(location=2) in vec3 material;
 uniform float aspect,distance;uniform bool cockpit;
 out vec3 n;out vec3 albedo;
 void main(){
 mat3 rotate=mat3(.866,0.,-.5,0.,1.,0.,.5,0.,.866)*mat3(1.,0.,0.,0.,.94,.342,0.,-.342,.94);
 vec3 pos=cockpit?position:rotate*position+vec3(-2.8,-1.,distance);
 if(cockpit) pos.x*=aspect*.73;
 n=cockpit?normal:rotate*normal;albedo=cockpit?material*.12:material;
 float near=.1,far=100.;
 gl_Position=vec4(pos.x/(.38*aspect),pos.y/.38,(far+near)/(far-near)*pos.z-2.*far*near/(far-near),pos.z);
 }`,
    `#version 300 es
 precision highp float;in vec3 n;in vec3 albedo;out vec4 color;
 void main(){vec3 normal=normalize(n);float light=abs(dot(normal,normalize(vec3(.4,.8,-.6))));float rim=pow(1.-abs(normal.z),3.);
 vec3 c=albedo*(.14+light*.9)+vec3(.28,.35,.4)*rim*.04;
 color=vec4(pow(c,vec3(.4545)),1.);}`,
  );
  const meshes = [true, false].map((cockpit) => {
    const data = geometry(cockpit),
      vao = gl.createVertexArray(),
      buffer = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    for (let i = 0; i < 3; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 3, gl.FLOAT, false, 36, i * 12);
    }
    return { vao, buffer, count: data.length / 9 };
  });
  const aspect = gl.getUniformLocation(p, 'aspect'),
    distance = gl.getUniformLocation(p, 'distance'),
    cockpit = gl.getUniformLocation(p, 'cockpit');
  return {
    render(mode: Perspective) {
      if (gl.isContextLost())
        throw new Error('Probe GPU context was lost. Reload the simulation.');
      const rect = canvas.getBoundingClientRect(),
        dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(rect.width * dpr)),
        h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const separation = mode === 'wide' ? 1e7 : 25;
      // Cull genuinely subpixel geometry, not an enlarged distant spacecraft.
      if (
        mode === 'optics' ||
        (mode !== 'onboard' && probePixelSpan(separation, h) < 0.5)
      )
        return;
      const mesh = meshes[mode === 'onboard' ? 0 : 1];
      gl.enable(gl.DEPTH_TEST);
      gl.useProgram(p);
      gl.bindVertexArray(mesh.vao);
      gl.uniform1f(aspect, w / h);
      gl.uniform1f(distance, separation);
      gl.uniform1i(cockpit, mode === 'onboard' ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    },
    dispose() {
      meshes.forEach((m) => {
        gl.deleteBuffer(m.buffer);
        gl.deleteVertexArray(m.vao);
      });
      gl.deleteProgram(p);
    },
  };
}
