import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newNavigation,
  stepNavigation,
  memoryTarget,
} from '../lib/navigation.ts';
import { loadFlightPath, sampleFlightPath } from '../lib/flight-path.ts';
const idle = { x: 0, y: 0, brake: false };
void test('an unsteered probe can collide and fail before reaching the end', () => {
  let n = newNavigation('exterior');
  for (let i = 0; i < 28 * 60; i++) n = stepNavigation(n, 1 / 60, idle);
  assert.equal(n.failed, true);
  assert.equal(n.hull, 0);
  assert.equal(n.complete, false);
});
void test('inertial steering and braking can survive the local encounter', () => {
  let n = newNavigation('exterior');
  for (let i = 0; i < 29 * 60; i++) {
    const t = i / 60;
    n = stepNavigation(
      n,
      1 / 60,
      t < 2.6
        ? { x: -1, y: 0, brake: false }
        : t < 4.6
          ? { x: 0, y: 0, brake: true }
          : idle,
    );
  }
  assert.equal(n.failed, false);
  assert.equal(n.complete, true);
  assert.ok(n.hull > 0);
  assert.ok(n.fuel < 70);
});
void test('local dynamics agree at 30 and 120 rendering frames per second', () => {
  const simulate = (fps: number) => {
    let n = newNavigation('exterior');
    for (let i = 0; i < fps * 3; i++)
      n = stepNavigation(n, 1 / fps, { x: 0.7, y: 0.2, brake: false }, [
        [1e-8, 0],
        [0, -1e-8],
      ]);
    return n;
  };
  const a = simulate(30),
    b = simulate(120);
  assert.ok(Math.abs(a.x - b.x) < 1e-9);
  assert.ok(Math.abs(a.fuel - b.fuel) < 1e-9);
});
void test('exhausting delta-v stops thrust but preserves inertial motion', () => {
  const initial = { ...newNavigation('exterior'), fuel: 0, vx: 2 };
  const result = stepNavigation(initial, 0.2, { x: 1, y: 0, brake: false });
  assert.equal(result.vx, 2);
  assert.ok(Math.abs(result.x - 0.4) < 1e-10);
});
void test('the speculative finale has a reachable success state and can also be missed', () => {
  let n = newNavigation('memory');
  for (let i = 0; i < 30 * 120 && !n.complete && !n.failed; i++) {
    const target = memoryTarget(n.gates);
    n = stepNavigation(n, 1 / 120, {
      x: (target.x - n.x) * 0.6 - n.vx * 1.1,
      y: (target.y - n.y) * 0.6 - n.vy * 1.1,
      brake: false,
    });
  }
  assert.equal(n.failed, false);
  assert.equal(n.complete, true);
  assert.equal(n.gates, 3);
  let missed = newNavigation('memory');
  for (let i = 0; i < 11 * 60; i++)
    missed = stepNavigation(missed, 1 / 60, idle);
  assert.equal(missed.failed, true);
});
void test('cached Kerr path retains mass shell and sampled physical states', async () => {
  const path = await loadFlightPath(30, 77, 0.6),
    again = await loadFlightPath(30, 77, 0.6);
  assert.equal(path, again);
  assert.ok(path.at(-1)?.complete);
  assert.ok(path.every((f) => f.residual < 1e-7));
  assert.equal(sampleFlightPath(path, 22.8), path[91]);
  assert.equal(sampleFlightPath(path, 1e6), path.at(-1));
});
