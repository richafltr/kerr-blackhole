// Float64 reference for the Schwarzschild shader's null orbit equation.
// u = 1/r, q = du/dphi, G=c=M=1. The invariant is q²+u²−2u³=1/b².
export function lightStep(u: number, q: number, h: number): [number, number] {
  const f = (x: number) => -x + 3 * x * x;
  const a = q,
    b = f(u),
    c = q + (h * b) / 2,
    d = f(u + (h * a) / 2),
    e = q + (h * d) / 2,
    g = f(u + (h * c) / 2),
    j = q + h * g,
    k = f(u + h * e);
  return [
    u + (h * (a + 2 * c + 2 * e + j)) / 6,
    q + (h * (b + 2 * d + 2 * g + k)) / 6,
  ];
}
export function traceLight(b: number, h = 0.012, maxSteps = 650) {
  let u = 1 / 30,
    q = Math.sqrt(1 / (b * b) - u * u + 2 * u * u * u),
    drift = 0,
    phi = 0;
  for (let i = 0; i < maxSteps; i++) {
    const previous = u;
    [u, q] = lightStep(u, q, h);
    phi += h;
    drift = Math.max(
      drift,
      Math.abs((q * q + u * u - 2 * u * u * u) * b * b - 1),
    );
    if (u <= 0)
      return {
        status: 'escaped',
        phi: phi - h + (h * previous) / (previous - u),
        drift,
      };
    if (u >= 0.5) return { status: 'captured', phi, drift };
  }
  return { status: 'unresolved', phi, drift };
}
