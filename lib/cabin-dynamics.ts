/** Local SI response. Mount/tether constants are explicit authored mechanical assumptions. */
export type CabinDynamics = {
  remainder: number;
  head: number[];
  headVelocity: number[];
  loose: number[];
  looseVelocity: number[];
  impactId: number;
};
export function newCabinDynamics(): CabinDynamics {
  return {
    remainder: 0,
    head: [0, 0],
    headVelocity: [0, 0],
    loose: [0, 0],
    looseVelocity: [0.018, -0.008],
    impactId: 0,
  };
}
export function stepCabin(
  s: CabinDynamics,
  dt: number,
  acceleration: number[],
  impact?: { id: number; deltaVelocity: number[] },
) {
  if (dt <= 0) return;
  if (impact && impact.id !== s.impactId) {
    s.impactId = impact.id;
    // Whole-vehicle velocity impulse; no curvature amplification or arbitrary camera noise.
    s.headVelocity[0] -= impact.deltaVelocity[0];
    s.headVelocity[1] -= impact.deltaVelocity[1];
  }
  s.remainder += Math.min(0.25, dt);
  const h = 1 / 120;
  while (s.remainder >= h) {
    s.remainder -= h;
    for (let i = 0; i < 2; i++) {
      s.headVelocity[i] +=
        (-acceleration[i] - 70 * s.head[i] - 12 * s.headVelocity[i]) * h;
      s.head[i] += s.headVelocity[i] * h;
      // A slack tether engages at 0.15 m; mechanical damping only when taut.
      const excess = Math.max(0, Math.abs(s.loose[i]) - 0.15);
      s.looseVelocity[i] +=
        (-acceleration[i] -
          Math.sign(s.loose[i]) * excess * 12 -
          (excess ? 1.8 * s.looseVelocity[i] : 0)) *
        h;
      s.loose[i] += s.looseVelocity[i] * h;
    }
  }
}
