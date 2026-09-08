export type State = [number, number, number]; // r, dr/dtau, phi; G=c=M=1
export const presets = {
  precession: {
    name: 'Relativistic precession',
    r: 14,
    l: 3.8,
    description:
      'The closest approach advances each orbit. The path traces a rosette instead of closing into an ellipse.',
  },
  circular: {
    name: 'Stable circular orbit',
    r: 10,
    l: 10 / Math.sqrt(7),
    description:
      'At 10 M, the circular geodesic is stable. Its angular momentum is L = r / √(r − 3).',
  },
  plunge: {
    name: 'Capture trajectory',
    r: 12,
    l: 3.2,
    description:
      'With too little angular momentum to turn back, the particle plunges inward. We stop at 2.05 M, just outside the horizon.',
  },
};
export function derivative(s: State, l: number, relativistic = true): State {
  const [r, v] = s;
  return [
    v,
    -1 / (r * r) +
      (l * l) / (r * r * r) -
      (relativistic ? (3 * l * l) / r ** 4 : 0),
    l / (r * r),
  ];
}
export function step(
  s: State,
  l: number,
  h: number,
  relativistic = true,
): State {
  const add = (a: State, b: State, f: number): State =>
    a.map((x, i) => x + f * b[i]) as State;
  const a = derivative(s, l, relativistic),
    b = derivative(add(s, a, h / 2), l, relativistic),
    c = derivative(add(s, b, h / 2), l, relativistic),
    d = derivative(add(s, c, h), l, relativistic);
  return s.map(
    (x, i) => x + (h * (a[i] + 2 * b[i] + 2 * c[i] + d[i])) / 6,
  ) as State;
}
export function energySquared(s: State, l: number) {
  return s[1] ** 2 + (1 - 2 / s[0]) * (1 + (l * l) / (s[0] * s[0]));
}
export function trajectory(
  r: number,
  l: number,
  relativistic = true,
  count = 18000,
  h = 0.08,
) {
  let state: State = [r, 0, 0];
  const states: State[] = [state];
  const initialEnergy = energySquared(state, l);
  let error = 0;
  for (let i = 0; i < count; i++) {
    state = step(state, l, h, relativistic);
    if (!state.every(Number.isFinite)) throw new Error('Nonfinite trajectory');
    states.push(state);
    if (relativistic)
      error = Math.max(
        error,
        Math.abs(energySquared(state, l) - initialEnergy) / initialEnergy,
      );
    if (state[0] <= 2.05 || state[0] > 100) break;
  }
  return { states, error, captured: state[0] <= 2.05, h };
}
