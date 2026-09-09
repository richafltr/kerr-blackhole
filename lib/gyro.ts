import { covariantMetric, type Camera, type FourVector } from './camera.ts';
import { inverseMetric, type KerrState, type Vector3 } from './kerr.ts';
import { connection } from './tides.ts';

/** Spatial contravariant legs of a freely carried orthonormal tetrad. */
export type Gyro = [FourVector, FourVector, FourVector];
export function velocity(s: KerrState, pt: number, spin: number): FourVector {
  const p = [pt, ...s.slice(3)];
  return inverseMetric(s.slice(0, 3) as Vector3, spin).map((row) =>
    row.reduce((sum, v, i) => sum + v * p[i], 0),
  ) as FourVector;
}
export function liftCamera(c: Camera, spin: number): Gyro {
  const inverse = inverseMetric(c.position, spin);
  return [c.forward, c.right, c.up].map((e) =>
    inverse.map((row) => row.reduce((sum, v, i) => sum + v * e[i], 0)),
  ) as Gyro;
}
export function gyroDerivative(
  frame: Gyro,
  s: KerrState,
  pt: number,
  spin: number,
): Gyro {
  const gamma = connection(s.slice(0, 3) as Vector3, spin),
    u = velocity(s, pt, spin);
  // de^mu/dtau = -Gamma^mu_ab u^a e^b. No aiming at the hole.
  return frame.map((e) =>
    gamma.map(
      (g) =>
        -g.reduce(
          (sum, row, a) =>
            sum + u[a] * row.reduce((v, value, b) => v + value * e[b], 0),
          0,
        ),
    ),
  ) as Gyro;
}
export function shiftGyro(a: Gyro, d: Gyro, h: number): Gyro {
  return a.map((e, j) => e.map((v, i) => v + h * d[j][i])) as Gyro;
}
/** Remove numerical drift only; preserve the transported spatial directions. */
export function orthonormalGyro(
  frame: Gyro,
  s: KerrState,
  pt: number,
  spin: number,
): Gyro {
  const g = covariantMetric(s.slice(0, 3) as Vector3, spin),
    u = velocity(s, pt, spin);
  const dot = (a: number[], b: number[]) =>
    a.reduce(
      (sum, v, i) => sum + v * g[i].reduce((n, w, j) => n + w * b[j], 0),
      0,
    );
  const basis: FourVector[] = [];
  for (const initial of frame) {
    const projection = dot(initial, u) / -dot(u, u);
    let e = initial.map((v, i) => v + projection * u[i]) as FourVector;
    for (const leg of basis) {
      const p = dot(e, leg);
      e = e.map((v, i) => v - p * leg[i]) as FourVector;
    }
    const length = Math.sqrt(dot(e, e));
    if (!(length > 0) || !Number.isFinite(length))
      throw new Error('Gyroscope frame became invalid.');
    basis.push(e.map((v) => v / length) as FourVector);
  }
  return basis as Gyro;
}
export function gyroCamera(
  s: KerrState,
  pt: number,
  spin: number,
  frame: Gyro,
): Camera {
  const position = s.slice(0, 3) as Vector3,
    g = covariantMetric(position, spin);
  const lower = (e: FourVector) =>
    g.map((row) => row.reduce((sum, v, i) => sum + v * e[i], 0)) as FourVector;
  const basis = orthonormalGyro(frame, s, pt, spin);
  return {
    position,
    observer: lower(velocity(s, pt, spin)),
    forward: lower(basis[0]),
    right: lower(basis[1]),
    up: lower(basis[2]),
  };
}
