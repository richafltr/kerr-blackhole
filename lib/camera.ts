import { kerrField, type Vector3, type KerrState } from './kerr.ts';
export type FourVector = [number, number, number, number];
export type Camera = {
  position: Vector3;
  observer: FourVector;
  forward: FourVector;
  right: FourVector;
  up: FourVector;
};
export function covariantMetric(position: Vector3, a: number) {
  const f = kerrField(position, a),
    l = [1, ...f.l];
  return l.map((v, i) =>
    l.map((w, j) => (i === j ? (i === 0 ? -1 : 1) : 0) + 2 * f.h * v * w),
  );
}
export function makeCamera(
  radius: number,
  inclination: number,
  a: number,
): Camera {
  const theta = (inclination * Math.PI) / 180;
  const position: Vector3 = [
    0,
    Math.sqrt(radius * radius + a * a) * Math.sin(theta),
    radius * Math.cos(theta),
  ];
  const g = covariantMetric(position, a);
  if (g[0][0] >= 0)
    throw new Error('Static observer must be outside the ergosphere');
  return observerCamera(position, [1 / Math.sqrt(-g[0][0]), 0, 0, 0], a);
}
// A camera whose attitude tracks the hole; this is not a gyroscope-transport model.
export function observerCamera(
  position: Vector3,
  observer: FourVector,
  a: number,
): Camera {
  const g = covariantMetric(position, a);
  const dot = (v: FourVector, w: FourVector) =>
    v.reduce(
      (sum, x, i) => sum + x * g[i].reduce((s, y, j) => s + y * w[j], 0),
      0,
    );
  const lower = (v: FourVector) =>
    g.map((row) => row.reduce((s, x, i) => s + x * v[i], 0)) as FourVector;
  const basis: FourVector[] = [];
  for (const direction of [
    position.map((x) => -x),
    [position[1], -position[0], 0],
    [0, 0, 1],
  ]) {
    let v = [0, ...direction] as FourVector;
    const timeProjection = dot(v, observer);
    v = v.map((x, i) => x + timeProjection * observer[i]) as FourVector;
    for (const e of basis) {
      const projection = dot(v, e);
      v = v.map((x, i) => x - projection * e[i]) as FourVector;
    }
    const norm = Math.sqrt(dot(v, v));
    basis.push(v.map((x) => x / norm) as FourVector);
  }
  return {
    position,
    observer: lower(observer),
    forward: lower(basis[0]),
    right: lower(basis[1]),
    up: lower(basis[2]),
  };
}
export function cameraRay(
  camera: Camera,
  x: number,
  y: number,
  roll = 0,
): { state: KerrState; pt: number } {
  const c = Math.cos((roll * Math.PI) / 180),
    s = Math.sin((roll * Math.PI) / 180);
  const px = 0.38 * (c * x + s * y),
    py = 0.38 * (-s * x + c * y),
    norm = Math.sqrt(1 + px * px + py * py);
  // Past-directed unit-frequency photon in the observer's tetrad.
  const p = camera.observer.map(
    (v, i) =>
      -v +
      (camera.forward[i] + px * camera.right[i] + py * camera.up[i]) / norm,
  ) as FourVector;
  return { state: [...camera.position, p[1], p[2], p[3]], pt: p[0] };
}
export function isco(a: number) {
  const z1 = 1 + Math.cbrt(1 - a * a) * (Math.cbrt(1 + a) + Math.cbrt(1 - a)),
    z2 = Math.sqrt(3 * a * a + z1 * z1);
  return 3 + z2 - Math.sign(a) * Math.sqrt((3 - z1) * (3 + z1 + 2 * z2));
}
