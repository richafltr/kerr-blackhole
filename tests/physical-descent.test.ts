import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseProbe, stepFlight, flightCamera } from '../lib/flight.ts';
import {
  covariantMetric,
  cameraRay,
  rotateCamera,
  relativeRotation,
} from '../lib/camera.ts';
import { velocity } from '../lib/gyro.ts';
import { hamiltonian } from '../lib/kerr.ts';
import { integrateSky } from '../lib/sky-light.ts';
import { newCabinDynamics, stepCabin } from '../lib/cabin-dynamics.ts';
import {
  newNavigation,
  stepNavigation,
  panelImpulse,
} from '../lib/navigation.ts';

void test('parallel-transported frame remains orthonormal and orthogonal to the infaller', () => {
  for (const spin of [-0.9, 0, 0.9]) {
    let f = releaseProbe(30, 77, spin);
    for (let t = 0; t < 18; t++) {
      f = stepFlight(f, 10);
      const g = covariantMetric(
          f.state.slice(0, 3) as [number, number, number],
          spin,
        ),
        u = velocity(f.state, f.pt, spin);
      const dot = (a: number[], b: number[]) =>
        a.reduce(
          (s, v, i) => s + v * g[i].reduce((n, w, j) => n + w * b[j], 0),
          0,
        );
      for (let i = 0; i < 3; i++) {
        assert.ok(Math.abs(dot(f.gyro[i], u)) < 1e-8);
        for (let j = 0; j < 3; j++)
          assert.ok(
            Math.abs(dot(f.gyro[i], f.gyro[j]) - (i === j ? 1 : 0)) < 1e-8,
          );
      }
    }
  }
});
void test('transported gyroscope converges under RK4 refinement', () => {
  const f = releaseProbe(30, 77, 0.9),
    a = stepFlight(f, 180, 0.4),
    b = stepFlight(f, 180, 0.2),
    c = stepFlight(f, 180, 0.1);
  const distance = (x: typeof a, y: typeof a) =>
    Math.hypot(...x.gyro.flat().map((v, i) => v - y.gyro.flat()[i]));
  assert.ok(distance(b, c) < distance(a, b) / 8);
});
void test('arbitrary carried-frame camera roll preserves the null constraint', () => {
  const f = stepFlight(releaseProbe(30, 77, 0.6), 160),
    c = Math.cos(0.7),
    s = Math.sin(0.7),
    m = [c, s, 0, -s, c, 0, 0, 0, 1];
  const view = rotateCamera(flightCamera(f), m);
  for (const [x, y] of [
    [0, 0],
    [0.8, 0.2],
    [-1, -0.4],
  ]) {
    const r = cameraRay(view, x, y);
    assert.ok(Math.abs(hamiltonian(r.state, r.pt, f.spin)) < 1e-8);
  }
  const identity = relativeRotation(m, m);
  identity.forEach((v, i) =>
    assert.ok(Math.abs(v - (i % 4 === 0 ? 1 : 0)) < 1e-14),
  );
});
void test('uniform sky integrates to the analytic constant spherical harmonic without a directional bias', () => {
  const data = new Float32Array(32 * 16 * 4);
  for (let i = 0; i < 32 * 16; i++) data.set([1, 1, 1, 1], i * 4);
  const sh = integrateSky(data, 32, 16).coefficients;
  assert.ok(Math.abs(sh[0][0] - Math.sqrt(4 * Math.PI)) < 1e-5);
  // Latitude midpoint quadrature has a bounded second-order truncation error.
  for (let i = 1; i < 9; i++) assert.ok(Math.abs(sh[i][0]) < 0.02);
});
void test('free fall does not shake the head; thrust displaces the suspended head in the opposite direction', () => {
  const quiet = newCabinDynamics();
  for (let i = 0; i < 120; i++) stepCabin(quiet, 1 / 120, [0, 0]);
  assert.deepEqual(quiet.head, [0, 0]);
  const thrust = newCabinDynamics();
  for (let i = 0; i < 120; i++) stepCabin(thrust, 1 / 120, [1.6, 0]);
  assert.ok(thrust.head[0] < -0.015 && thrust.head[0] > -0.04);
  assert.ok(thrust.loose[0] < 0);
});
void test('RCS roll consumes delta-v, rotates translation axes, and coasts after fuel exhaustion', () => {
  let n = newNavigation('exterior');
  for (let i = 0; i < 240; i++)
    n = stepNavigation(n, 1 / 120, { x: 0, y: 0, brake: false, roll: 1 });
  assert.ok(n.roll > 0 && n.fuel < 70);
  const exhausted = { ...n, fuel: 0 };
  const after = stepNavigation(exhausted, 0.2, {
    x: 1,
    y: 0,
    brake: false,
    roll: -1,
  });
  assert.equal(after.angularVelocity, exhausted.angularVelocity);
  assert.ok(after.roll > exhausted.roll);
  const rotated = { ...newNavigation('exterior'), roll: Math.PI / 2 };
  const moved = stepNavigation(rotated, 0.1, { x: 1, y: 0, brake: false });
  assert.ok(moved.vy > 0.15 && Math.abs(moved.vx) < 1e-10);
});

void test('the carried camera has right-handed right/up/back spatial axes', () => {
  const f = releaseProbe(30, 77, 0),
    [forward, right, up] = f.gyro;
  const cross = [
    right[2] * up[3] - right[3] * up[2],
    right[3] * up[1] - right[1] * up[3],
    right[1] * up[2] - right[2] * up[1],
  ];
  assert.ok(cross.reduce((sum, v, i) => sum - v * forward[i + 1], 0) > 0);
});
void test('Schwarzschild radial infall preserves the analytic transverse gyroscope directions', () => {
  const initial = releaseProbe(30, 77, 0),
    after = stepFlight(initial, 170);
  for (const leg of [1, 2])
    for (let i = 0; i < 4; i++)
      assert.ok(Math.abs(initial.gyro[leg][i] - after.gyro[leg][i]) < 1e-8);
});

void test('normal panel impulses conserve total momentum and dissipate kinetic energy', () => {
  for (let i = 0; i < 6; i++) {
    const j = panelImpulse(i, 8, 10),
      craft = j.map((v) => v / 6000),
      panel = j.map((v, k) => (k === 2 ? 10 : 0) - v / 12);
    for (let k = 0; k < 3; k++)
      assert.ok(
        Math.abs(6000 * craft[k] + 12 * panel[k] - (k === 2 ? 120 : 0)) < 1e-10,
      );
    const energy =
      0.5 * 6000 * craft.reduce((s, v) => s + v * v, 0) +
      0.5 * 12 * panel.reduce((s, v) => s + v * v, 0);
    assert.ok(energy <= 600 + 1e-8 && energy >= 0);
  }
});
