import { inverseMetric, kerrField, type Vector3 } from './kerr.ts';
import { type Camera, type FourVector } from './camera.ts';
import { physicalScale } from './mission.ts';
const indices = [0, 1, 2, 3];
// Stationary metric: analytic first derivatives from the reference field's dual numbers.
export function connection(x: Vector3, spin: number) {
  const f = kerrField(x, spin),
    l = [1, ...f.l],
    gi = inverseMetric(x, spin);
  const dg = indices.map((k) =>
    indices.map((i) =>
      indices.map((j) =>
        k === 0
          ? 0
          : 2 * f.dh[k - 1] * l[i] * l[j] +
            2 *
              f.h *
              ((i ? f.dl[i - 1][k - 1] : 0) * l[j] +
                l[i] * (j ? f.dl[j - 1][k - 1] : 0)),
      ),
    ),
  );
  return indices.map((r) =>
    indices.map((m) =>
      indices.map(
        (n) =>
          0.5 *
          gi[r].reduce(
            (sum, value, s) =>
              sum + value * (dg[m][s][n] + dg[n][s][m] - dg[s][m][n]),
            0,
          ),
      ),
    ),
  );
}
// T_ij = -R_(i)(0)(j)(0). Positive eigenvalues stretch a freely falling separation.
// Central differences of the analytic connection approximate its spatial derivatives.
export function tidalTensor(camera: Camera, spin: number, relativeStep = 2e-4) {
  const x = camera.position,
    gi = inverseMetric(x, spin),
    gamma = connection(x, spin);
  const raise = (v: FourVector) =>
    gi.map((row) => row.reduce((s, a, i) => s + a * v[i], 0));
  const u = raise(camera.observer),
    covBasis = [camera.forward, camera.right, camera.up],
    basis = covBasis.map(raise);
  const h = Math.max(1, kerrField(x, spin).r) * relativeStep;
  const derivative = indices.map((k) => {
    if (k === 0)
      return indices.map(() => indices.map(() => indices.map(() => 0)));
    const shift = (sign: number) =>
      x.map((v, i) => v + (i === k - 1 ? sign * h : 0)) as Vector3;
    const plus = connection(shift(1), spin),
      minus = connection(shift(-1), spin);
    return indices.map((r) =>
      indices.map((m) =>
        indices.map((n) => (plus[r][m][n] - minus[r][m][n]) / (2 * h)),
      ),
    );
  });
  const curvature = indices.map((r) =>
    indices.map((s) =>
      indices.map((m) =>
        indices.map(
          (n) =>
            derivative[m][r][n][s] -
            derivative[n][r][m][s] +
            indices.reduce(
              (sum, l) =>
                sum +
                gamma[r][m][l] * gamma[l][n][s] -
                gamma[r][n][l] * gamma[l][m][s],
              0,
            ),
        ),
      ),
    ),
  );
  return covBasis.map((e) =>
    basis.map((b) => {
      let result = 0;
      for (const r of indices)
        for (const s of indices)
          for (const m of indices)
            for (const n of indices)
              result -= e[r] * curvature[r][s][m][n] * u[s] * b[m] * u[n];
      return result;
    }),
  );
}
export function tidalEigenvalues(tensor: number[][]) {
  const a = tensor.map((row, i) => row.map((v, j) => 0.5 * (v + tensor[j][i])));
  for (let sweep = 0; sweep < 12; sweep++)
    for (const [p, q] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ]) {
      if (Math.abs(a[p][q]) < 1e-18) continue;
      const angle = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]),
        c = Math.cos(angle),
        s = Math.sin(angle);
      const pp = a[p][p],
        qq = a[q][q],
        pq = a[p][q];
      a[p][p] = c * c * pp - 2 * s * c * pq + s * s * qq;
      a[q][q] = s * s * pp + 2 * s * c * pq + c * c * qq;
      a[p][q] = a[q][p] = 0;
      for (let k = 0; k < 3; k++)
        if (k !== p && k !== q) {
          const kp = a[k][p],
            kq = a[k][q];
          a[k][p] = a[p][k] = c * kp - s * kq;
          a[k][q] = a[q][k] = s * kp + c * kq;
        }
    }
  return [a[0][0], a[1][1], a[2][2]].sort((a, b) => a - b);
}
export function tidalStretch(
  camera: Camera,
  spin: number,
  lengthM = 2,
  massSuns = 1e8,
) {
  return (
    (tidalEigenvalues(tidalTensor(camera, spin))[2] * lengthM) /
    physicalScale(massSuns).time ** 2
  );
}
