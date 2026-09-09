import {
  liftCamera,
  gyroDerivative,
  shiftGyro,
  orthonormalGyro,
  gyroCamera,
  type Gyro,
} from './gyro.ts';
import { makeCamera, observerCamera, type FourVector } from './camera.ts';
import {
  inverseMetric,
  kerrDerivative,
  kerrField,
  hamiltonian,
  type KerrState,
  type Vector3,
} from './kerr.ts';
export type Flight = {
  state: KerrState;
  gyro: Gyro;
  pt: number;
  spin: number;
  properTime: number;
  coordinateTime: number;
  radius: number;
  complete: boolean;
  residual: number;
};
export function releaseProbe(
  radius: number,
  inclination: number,
  spin: number,
): Flight {
  const camera = makeCamera(radius, inclination, spin),
    p = camera.observer;
  return {
    state: [...camera.position, p[1], p[2], p[3]],
    gyro: liftCamera(camera, spin),
    pt: p[0],
    spin,
    properTime: 0,
    coordinateTime: 0,
    radius,
    complete: false,
    residual: 0,
  };
}
function timeDerivative(s: KerrState, pt: number, a: number) {
  const f = kerrField(s.slice(0, 3) as Vector3, a);
  return (
    -pt + 2 * f.h * (-pt + f.l.reduce((sum, v, i) => sum + v * s[i + 3], 0))
  );
}
export function stepFlight(
  f: Flight,
  properDuration: number,
  maxStep = 0.05,
): Flight {
  let { state, gyro, coordinateTime, properTime, radius, complete, residual } =
    f;
  let remaining = properDuration;
  const limit = 1 + Math.sqrt(1 - f.spin * f.spin) + 0.3;
  while (remaining > 1e-10 && !complete) {
    const h = Math.min(maxStep, remaining);
    const shift = (d: KerrState, k: number) =>
      state.map((v, i) => v + k * d[i]) as KerrState;
    const a = kerrDerivative(state, f.pt, f.spin),
      s2 = shift(a, h / 2),
      b = kerrDerivative(s2, f.pt, f.spin),
      s3 = shift(b, h / 2),
      c = kerrDerivative(s3, f.pt, f.spin),
      s4 = shift(c, h),
      d = kerrDerivative(s4, f.pt, f.spin);
    const ga = gyroDerivative(gyro, state, f.pt, f.spin),
      gb = gyroDerivative(shiftGyro(gyro, ga, h / 2), s2, f.pt, f.spin),
      gc = gyroDerivative(shiftGyro(gyro, gb, h / 2), s3, f.pt, f.spin),
      gd = gyroDerivative(shiftGyro(gyro, gc, h), s4, f.pt, f.spin);
    gyro = gyro.map((e, j) =>
      e.map(
        (v, i) =>
          v + (h * (ga[j][i] + 2 * gb[j][i] + 2 * gc[j][i] + gd[j][i])) / 6,
      ),
    ) as Gyro;
    coordinateTime +=
      (h *
        (timeDerivative(state, f.pt, f.spin) +
          2 * timeDerivative(s2, f.pt, f.spin) +
          2 * timeDerivative(s3, f.pt, f.spin) +
          timeDerivative(s4, f.pt, f.spin))) /
      6;
    state = state.map(
      (v, i) => v + (h * (a[i] + 2 * b[i] + 2 * c[i] + d[i])) / 6,
    ) as KerrState;
    if (!state.every(Number.isFinite))
      throw new Error('Flight integration became nonfinite.');
    properTime += h;
    remaining -= h;
    radius = kerrField(state.slice(0, 3) as Vector3, f.spin).r;
    residual = Math.max(
      residual,
      Math.abs(hamiltonian(state, f.pt, f.spin) + 0.5),
    );
    complete = radius <= limit;
  }
  return {
    ...f,
    state,
    gyro: orthonormalGyro(gyro, state, f.pt, f.spin),
    coordinateTime,
    properTime,
    radius,
    complete,
    residual,
  };
}
export function flightCamera(f: Flight) {
  return gyroCamera(f.state, f.pt, f.spin, f.gyro);
}
// Retained reference for optical comparison; gameplay uses the carried frame.
export function trackingFlightCamera(f: Flight) {
  const position = f.state.slice(0, 3) as Vector3,
    p = [f.pt, ...f.state.slice(3)];
  const inverse = inverseMetric(position, f.spin);
  const u = inverse.map((row) =>
    row.reduce((sum, v, i) => sum + v * p[i], 0),
  ) as FourVector;
  return observerCamera(position, u, f.spin);
}
