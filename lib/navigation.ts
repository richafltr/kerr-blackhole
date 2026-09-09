/** Small, local encounter around the geodesic. SI metres/seconds.
 * Obstacles and survivability are authored game conditions, not an accretion-flow or injury model.
 */
export type Input = { x: number; y: number; brake: boolean; roll?: number };
export type Obstacle = {
  x: number;
  y: number;
  z: number;
  radius: number;
  hit: boolean;
};
export type Navigation = {
  kind: 'exterior' | 'memory';
  time: number;
  remainder: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fuel: number;
  hull: number;
  flash: number;
  roll: number;
  angularVelocity: number;
  acceleration: [number, number];
  impact: {
    id: number;
    x: number;
    y: number;
    impulse: number;
    deltaVelocity: number[];
  };

  obstacles: Obstacle[];
  gates: number;
  complete: boolean;
  failed: boolean;
};
export const ENCOUNTER_SECONDS = 28;
export function newNavigation(kind: Navigation['kind']): Navigation {
  const points =
    kind === 'exterior'
      ? [
          [0, 0, -80],
          [0, 0, -135],
          [-9, 3, -170],
          [8, -4, -190],
          [0, 0, -225],
          [11, 4, -240],
        ]
      : [
          [0, 0, -80],
          [-8, 1, -140],
          [8, -3, -190],
          [0, 7, -245],
          [-6, -5, -300],
          [6, 4, -350],
        ];
  return {
    kind,
    time: 0,
    remainder: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    fuel: 70,
    hull: 3,
    flash: 0,
    roll: 0,
    angularVelocity: 0,
    acceleration: [0, 0],
    impact: { id: 0, x: 0, y: 0, impulse: 0, deltaVelocity: [0, 0, 0] },
    obstacles: points.map(([x, y, z]) => ({ x, y, z, radius: 2, hit: false })),
    gates: 0,
    complete: false,
    failed: false,
  };
}
export function stepNavigation(
  s: Navigation,
  duration: number,
  input: Input,
  tide: number[][] = [
    [0, 0],
    [0, 0],
  ],
): Navigation {
  if (s.complete || s.failed || duration <= 0) return s;
  const n = {
    ...s,
    obstacles: s.obstacles.map((o) => ({ ...o })),
    remainder: s.remainder + Math.min(duration, 0.25),
  };
  const h = 1 / 120,
    speed = n.kind === 'memory' ? 13 : 10;
  while (n.remainder + 1e-10 >= h && !n.failed && !n.complete) {
    n.remainder -= h;
    n.time += h;
    const norm = Math.max(1, Math.hypot(input.x, input.y));
    let ax = (input.x / norm) * 1.6,
      ay = (input.y / norm) * 1.6;
    // Body-frame translation jets; navigation axes are the local carried frame.
    const ca = Math.cos(n.roll),
      sa = Math.sin(n.roll),
      bx = ax;
    ax = ca * bx - sa * ay;
    ay = sa * bx + ca * ay;
    if (input.brake) {
      const v = Math.hypot(n.vx, n.vy),
        decel = Math.min(2.4, v / h);
      ax = v ? (-n.vx / v) * decel : 0;
      ay = v ? (-n.vy / v) * decel : 0;
    }
    // Ideal RCS rate controller: I=30000 kg m², mass=6000 kg, effective arm=4 m.
    const angularAcceleration = Math.max(
      -0.08,
      Math.min(0.08, ((input.roll ?? 0) * 0.14 - n.angularVelocity) * 3),
    );
    const dv =
        (Math.hypot(ax, ay) +
          (Math.abs(angularAcceleration) * 30000) / (6000 * 4)) *
        h,
      factor = dv ? Math.min(1, n.fuel / dv) : 0;
    n.fuel = Math.max(0, n.fuel - dv);
    n.angularVelocity += angularAcceleration * factor * h;
    n.roll += n.angularVelocity * h;
    n.acceleration = [ax * factor, ay * factor];
    n.vx += (ax * factor + tide[0][0] * n.x + tide[0][1] * n.y) * h;
    n.vy += (ay * factor + tide[1][0] * n.x + tide[1][1] * n.y) * h;
    n.x += n.vx * h;
    n.y += n.vy * h;
    n.flash = Math.max(0, n.flash - h * 1.4);
    for (const [index, o] of n.obstacles.entries()) {
      const before = o.z;
      o.z += speed * h;
      // Swept plane crossing; large render-frame gaps cannot tunnel through the probe.
      if (
        !o.hit &&
        before < 0 &&
        o.z >= 0 &&
        Math.hypot(o.x - n.x, o.y - n.y) < o.radius + 3.2
      ) {
        o.hit = true;
        n.hull--;
        n.flash = 1;
        const impulse = panelImpulse(index, n.time, speed);
        const deltaVelocity = impulse.map((v) => v / 6000);
        n.impact = {
          id: n.impact.id + 1,
          x: o.x - n.x,
          y: o.y - n.y,
          impulse: Math.hypot(...impulse),
          deltaVelocity,
        };
        n.vx += deltaVelocity[0];
        n.vy += deltaVelocity[1];
        n.angularVelocity +=
          ((o.x - n.x) * impulse[1] - (o.y - n.y) * impulse[0]) / 30000;
      }
    }
    if (n.hull <= 0 || Math.abs(n.x) > 25 || Math.abs(n.y) > 20)
      n.failed = true;
    if (n.kind === 'exterior') n.complete = n.time >= ENCOUNTER_SECONDS;
    else {
      const nextGate = 10 + n.gates * 9;
      if (n.time >= nextGate) {
        const target = memoryTarget(n.gates);
        if (Math.hypot(n.x - target.x, n.y - target.y) < 6) n.gates++;
        else n.failed = true;
      }
      n.complete = n.gates >= 3;
    }
  }
  return n;
}
export function memoryTarget(index: number) {
  return [
    { x: -8, y: 0 },
    { x: 7, y: 3 },
    { x: 0, y: -5 },
  ][Math.min(index, 2)];
}

/** Authored panel orientation is shared by rendering and normal-impulse response. */
export function panelAngles(
  index: number,
  time: number,
): [number, number, number] {
  return [index * 0.7 + time * 0.09, index * 0.2, time * 0.04];
}
export function panelImpulse(
  index: number,
  time: number,
  closingSpeed: number,
) {
  const [x, y, z] = panelAngles(index, time);
  // Column Y of a Three.js XYZ rotation: the thin panel's local surface normal.
  const normal = [
    -Math.cos(y) * Math.sin(z),
    Math.cos(x) * Math.cos(z) - Math.sin(x) * Math.sin(y) * Math.sin(z),
    Math.sin(x) * Math.cos(z) + Math.cos(x) * Math.sin(y) * Math.sin(z),
  ];
  const magnitude = ((12 * 6000) / (12 + 6000)) * closingSpeed * normal[2];
  return normal.map((v) => v * magnitude);
}
