import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseProbe, stepFlight, flightCamera } from '../lib/flight.ts';
import { cameraRay } from '../lib/camera.ts';
import { hamiltonian } from '../lib/kerr.ts';
void test('release is timelike and Schwarzschild fall follows its analytic radial energy equation', () => {
  let f = releaseProbe(30, 77, 0);
  assert.ok(Math.abs(hamiltonian(f.state, f.pt, 0) + 0.5) < 1e-14);
  f = stepFlight(f, 100);
  const [x, y, z, px, py, pz] = f.state;
  // Obtain dr/dτ numerically from a small further step; E² = 1-2/r_initial.
  const next = stepFlight(f, 0.001, 0.001),
    dr = (next.radius - f.radius) / 0.001;
  assert.ok(Math.abs(dr * dr - (2 / f.radius - 2 / 30)) < 1e-6);
  assert.ok(Number.isFinite(x + y + z + px + py + pz));
});
void test('Kerr infall conserves mass shell and angular momentum through the exterior route', () => {
  for (const spin of [-0.9, 0, 0.6, 0.9]) {
    let f = releaseProbe(30, 77, spin);
    const lz = f.state[0] * f.state[4] - f.state[1] * f.state[3];
    f = stepFlight(f, 250);
    assert.ok(f.complete);
    assert.ok(f.residual < 1e-7, `${spin}: ${f.residual}`);
    assert.ok(
      Math.abs(f.state[0] * f.state[4] - f.state[1] * f.state[3] - lz) < 1e-7,
    );
    assert.ok(f.coordinateTime > f.properTime);
  }
});
void test('moving camera launches null rays at unit observer frequency', () => {
  const f = stepFlight(releaseProbe(30, 77, 0.6), 150),
    camera = flightCamera(f);
  for (const [x, y] of [
    [0, 0],
    [0.5, 0.2],
    [-0.7, -0.4],
  ]) {
    const ray = cameraRay(camera, x, y);
    assert.ok(Math.abs(hamiltonian(ray.state, ray.pt, f.spin)) < 1e-10);
  }
});
void test('timelike state and coordinate time converge with step refinement', () => {
  const initial = releaseProbe(30, 77, 0.6),
    a = stepFlight(initial, 150, 0.8),
    b = stepFlight(initial, 150, 0.4),
    c = stepFlight(initial, 150, 0.2);
  const distance = (x: typeof a, y: typeof a) =>
    Math.hypot(
      ...x.state.map((v, i) => v - y.state[i]),
      x.coordinateTime - y.coordinateTime,
    );
  assert.ok(distance(b, c) < distance(a, b) / 8);
});
