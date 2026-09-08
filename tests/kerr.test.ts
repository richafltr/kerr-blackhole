import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  kerrField,
  inverseMetric,
  nullMomentum,
  hamiltonian,
  traceKerr,
  kerrStep,
  type KerrState,
} from '../lib/kerr.ts';
void test('spin-zero Kerr-Schild inverse metric agrees with analytic Schwarzschild', () => {
  const g = inverseMetric([10, 0, 0], 0);
  assert.ok(Math.abs(g[0][0] + 1.2) < 1e-14);
  assert.ok(Math.abs(g[0][1] - 0.2) < 1e-14);
  assert.ok(Math.abs(g[1][1] - 0.8) < 1e-14);
  assert.equal(g[2][2], 1);
});
void test('automatic field derivatives agree with independent central differences', () => {
  const p: [number, number, number] = [8, 3, 2],
    f = kerrField(p, 0.7),
    eps = 1e-4;
  for (let i = 0; i < 3; i++) {
    const a = [...p] as typeof p,
      b = [...p] as typeof p;
    a[i] += eps;
    b[i] -= eps;
    const fa = kerrField(a, 0.7),
      fb = kerrField(b, 0.7);
    assert.ok(Math.abs(f.dh[i] - (fa.h - fb.h) / (2 * eps)) < 1e-9);
    for (let j = 0; j < 3; j++)
      assert.ok(Math.abs(f.dl[j][i] - (fa.l[j] - fb.l[j]) / (2 * eps)) < 1e-9);
  }
});
void test('null initialization satisfies Hamiltonian for rotating metric', () => {
  const s: KerrState = [30, 7, 3, -1, 0, 0],
    pt = nullMomentum([30, 7, 3], [-1, 0, 0], 0.8);
  assert.ok(pt < 0);
  assert.ok(Math.abs(hamiltonian(s, pt, 0.8)) < 1e-14);
});
void test('Kerr rays conserve null constraint and axial angular momentum', () => {
  const t = traceKerr([30, 7, 3, -1, 0, 0], 0.7);
  assert.equal(t.status, 'escaped');
  assert.ok(t.nullResidual < 1e-7);
  assert.ok(t.angularMomentumDrift < 1e-7);
});
void test('Schwarzschild radial light ray crosses the horizon cutoff', () => {
  const t = traceKerr([30, 0, 0, -1, 0, 0], 0);
  assert.equal(t.status, 'captured');
  assert.ok(t.nullResidual < 1e-10);
});
void test('Kerr spin-reversal reflection symmetry', () => {
  const a = traceKerr([30, 7, 3, -1, 0, 0], 0.7),
    b = traceKerr([30, -7, 3, -1, 0, 0], -0.7);
  assert.equal(a.status, b.status);
  assert.ok(Math.abs(a.state[0] - b.state[0]) < 1e-8);
  assert.ok(Math.abs(a.state[1] + b.state[1]) < 1e-8);
  assert.ok(Math.abs(a.state[2] - b.state[2]) < 1e-8);
});
void test('Kerr RK4 converges under step refinement at matched affine time', () => {
  const initial: KerrState = [10, 4, 2, -1, 0, 0],
    pt = nullMomentum([10, 4, 2], [-1, 0, 0], 0.7);
  const integrate = (h: number, n: number) => {
    let s = initial;
    for (let i = 0; i < n; i++) s = kerrStep(s, pt, 0.7, h);
    return s;
  };
  const a = integrate(0.2, 40),
    b = integrate(0.1, 80),
    c = integrate(0.05, 160);
  const dist = (x: KerrState, y: KerrState) =>
    Math.hypot(...x.map((v, i) => v - y[i]));
  assert.ok(dist(b, c) < dist(a, b) / 8);
});
console.log('Kerr reference', traceKerr([30, 7, 3, -1, 0, 0], 0.7));
