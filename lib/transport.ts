import {
  kerrField,
  kerrStep,
  kerrDerivative,
  hamiltonian,
  type KerrState,
  type Vector3,
} from './kerr.ts';
import { covariantMetric, isco } from './camera.ts';
export const MAX_STEPS = 900;
export function traceTransport(
  initial: KerrState,
  pt: number,
  a: number,
  stepScale = 1,
  includeDisk = true,
) {
  let state = [...initial] as KerrState,
    maxNull = 0,
    maxLz = 0;
  const lz0 = state[0] * state[4] - state[1] * state[3],
    horizon = 1 + Math.sqrt(1 - a * a),
    inner = isco(a);
  const result = (status: number, data: Vector3, steps: number) => ({
    status,
    data,
    steps,
    maxNull,
    maxLz,
  });
  for (let i = 0; i < MAX_STEPS; i++) {
    const field = kerrField(state.slice(0, 3) as Vector3, a),
      r = field.r;
    if (r < horizon + 0.025) return result(0, [0, 0, 0], i);
    const derivative = kerrDerivative(state, pt, a),
      speed = Math.hypot(...derivative.slice(0, 3));
    if (r > 100) {
      const d = derivative.slice(0, 3).map((v) => v / speed) as Vector3;
      return result(2, d, i);
    }
    const h =
      stepScale *
      Math.min(
        0.8,
        (0.055 * r) / Math.max(speed, 1),
        (0.22 * (r - horizon)) / Math.max(speed, 1),
      );
    const next = kerrStep(state, pt, a, h);
    if (!next.every(Number.isFinite)) return result(4, [0, 0, 0], i);
    maxNull = Math.max(maxNull, Math.abs(hamiltonian(next, pt, a)) / (pt * pt));
    maxLz = Math.max(
      maxLz,
      Math.abs(next[0] * next[4] - next[1] * next[3] - lz0) /
        Math.max(1, Math.abs(lz0)),
    );
    if (includeDisk && state[2] * next[2] < 0) {
      let t = state[2] / (state[2] - next[2]),
        hit = kerrStep(state, pt, a, h * t);
      for (let j = 0; j < 2; j++) {
        const dz = kerrDerivative(hit, pt, a)[2];
        t = Math.max(0, Math.min(1, t - hit[2] / (h * dz)));
        hit = kerrStep(state, pt, a, h * t);
      }
      const radius = kerrField(hit.slice(0, 3) as Vector3, a).r;
      if (radius >= inner && radius <= 22) {
        const omega = 1 / (Math.pow(radius, 1.5) + a),
          v = [1, -omega * hit[1], omega * hit[0], 0],
          g = covariantMetric(hit.slice(0, 3) as Vector3, a);
        const norm = -v.reduce(
          (sum, x, k) => sum + x * g[k].reduce((s, y, m) => s + y * v[m], 0),
          0,
        );
        const frequency =
          (pt + omega * (hit[0] * hit[4] - hit[1] * hit[3])) / Math.sqrt(norm);
        if (!(norm > 0 && frequency > 0)) return result(4, [0, 0, 0], i);
        return result(1, [hit[0], hit[1], 1 / frequency], i + 1);
      }
    }
    state = next;
  }
  return result(3, [0, 0, 0], MAX_STEPS);
}
