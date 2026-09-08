// Float64 reference only. Cartesian ingoing Kerr–Schild, signature (-,+,+,+), M=1.
// Axis of spin is z. Forward-mode derivatives avoid finite-difference gradients.
export type Vector3 = [number, number, number];
export type KerrState = [number, number, number, number, number, number];
type Dual = { v: number; d: Vector3 };
const constant = (v: number): Dual => ({ v, d: [0, 0, 0] });
const add = (a: Dual, b: Dual): Dual => ({
  v: a.v + b.v,
  d: a.d.map((v, i) => v + b.d[i]) as Vector3,
});
const mul = (a: Dual, b: Dual): Dual => ({
  v: a.v * b.v,
  d: a.d.map((v, i) => v * b.v + a.v * b.d[i]) as Vector3,
});
const scale = (a: Dual, b: number) => mul(a, constant(b));
const inverse = (a: Dual): Dual => ({
  v: 1 / a.v,
  d: a.d.map((v) => -v / (a.v * a.v)) as Vector3,
});
const sqrt = (a: Dual): Dual => ({
  v: Math.sqrt(a.v),
  d: a.d.map((v) => v / (2 * Math.sqrt(a.v))) as Vector3,
});
const square = (a: Dual) => mul(a, a);
export function kerrField(position: Vector3, spin: number) {
  if (!Number.isFinite(spin) || Math.abs(spin) >= 1)
    throw new Error('Reference requires |a| < 1');
  const [x, y, z] = position.map((v, i) => ({
    v,
    d: [0, 1, 2].map((j) => (i === j ? 1 : 0)) as Vector3,
  }));
  const rho = add(add(square(x), square(y)), square(z));
  const b = add(rho, constant(-spin * spin));
  const r2 = scale(
    add(b, sqrt(add(square(b), scale(square(z), 4 * spin * spin)))),
    0.5,
  );
  const r = sqrt(r2),
    den = add(r2, constant(spin * spin));
  if (!(r.v > 0))
    throw new Error('Kerr ring singularity is outside the reference domain');
  const h = mul(
    mul(r, r2),
    inverse(add(square(r2), scale(square(z), spin * spin))),
  );
  const l = [
    mul(add(mul(r, x), scale(y, spin)), inverse(den)),
    mul(add(mul(r, y), scale(x, -spin)), inverse(den)),
    mul(z, inverse(r)),
  ];
  return {
    r: r.v,
    h: h.v,
    dh: h.d,
    l: l.map((v) => v.v) as Vector3,
    dl: l.map((v) => v.d),
  };
}
export function inverseMetric(position: Vector3, spin: number) {
  const f = kerrField(position, spin),
    l = [-1, ...f.l];
  return l.map((v, i) =>
    l.map((w, j) => (i === j ? (i === 0 ? -1 : 1) : 0) - 2 * f.h * v * w),
  );
}
export function nullMomentum(
  position: Vector3,
  momentum: Vector3,
  spin: number,
) {
  const f = kerrField(position, spin),
    w = f.l.reduce((s, v, i) => s + v * momentum[i], 0);
  const a = -0.5 - f.h,
    b = 2 * f.h * w,
    c = 0.5 * momentum.reduce((s, v) => s + v * v, 0) - f.h * w * w;
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a); // negative p_t, positive energy
}
export function hamiltonian(state: KerrState, pt: number, spin: number) {
  const f = kerrField(state.slice(0, 3) as Vector3, spin),
    p = state.slice(3) as Vector3;
  const k = -pt + f.l.reduce((s, v, i) => s + v * p[i], 0);
  return 0.5 * (-pt * pt + p.reduce((s, v) => s + v * v, 0)) - f.h * k * k;
}
export function kerrDerivative(
  state: KerrState,
  pt: number,
  spin: number,
): KerrState {
  const f = kerrField(state.slice(0, 3) as Vector3, spin),
    p = state.slice(3) as Vector3;
  const k = -pt + f.l.reduce((s, v, i) => s + v * p[i], 0);
  const dx = p.map((v, i) => v - 2 * f.h * k * f.l[i]);
  const dp = f.dh.map(
    (v, i) =>
      v * k * k +
      2 * f.h * k * f.dl.reduce((s, row, j) => s + p[j] * row[i], 0),
  );
  return [...dx, ...dp] as KerrState;
}
export function kerrStep(
  s: KerrState,
  pt: number,
  spin: number,
  h: number,
): KerrState {
  const shift = (d: KerrState, f: number) =>
    s.map((v, i) => v + f * d[i]) as KerrState;
  const a = kerrDerivative(s, pt, spin),
    b = kerrDerivative(shift(a, h / 2), pt, spin),
    c = kerrDerivative(shift(b, h / 2), pt, spin),
    d = kerrDerivative(shift(c, h), pt, spin);
  return s.map(
    (v, i) => v + (h * (a[i] + 2 * b[i] + 2 * c[i] + d[i])) / 6,
  ) as KerrState;
}
export function traceKerr(
  initial: KerrState,
  spin: number,
  h = 0.05,
  maxSteps = 8000,
) {
  let state = [...initial] as KerrState;
  const pt = nullMomentum(
    state.slice(0, 3) as Vector3,
    state.slice(3) as Vector3,
    spin,
  );
  const energy = -pt,
    lz = state[0] * state[4] - state[1] * state[3],
    horizon = 1 + Math.sqrt(1 - spin * spin);
  let nullResidual = 0,
    angularMomentumDrift = 0;
  for (let i = 0; i < maxSteps; i++) {
    state = kerrStep(state, pt, spin, h);
    if (!state.every(Number.isFinite))
      return {
        status: 'nonfinite',
        state,
        pt,
        nullResidual: Infinity,
        angularMomentumDrift: Infinity,
      };
    nullResidual = Math.max(
      nullResidual,
      Math.abs(hamiltonian(state, pt, spin)) / (energy * energy),
    );
    angularMomentumDrift = Math.max(
      angularMomentumDrift,
      Math.abs(state[0] * state[4] - state[1] * state[3] - lz) /
        Math.max(1, Math.abs(lz)),
    );
    const r = kerrField(state.slice(0, 3) as Vector3, spin).r;
    if (r < horizon + 0.02)
      return {
        status: 'captured',
        state,
        pt,
        nullResidual,
        angularMomentumDrift,
      };
    if (r > 60)
      return {
        status: 'escaped',
        state,
        pt,
        nullResidual,
        angularMomentumDrift,
      };
  }
  return {
    status: 'unresolved',
    state,
    pt,
    nullResidual,
    angularMomentumDrift,
  };
}
