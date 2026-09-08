import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trajectory, presets } from '../lib/physics.ts';
void test('analytic circular orbit stays at 10M', () => {
  const t = trajectory(10, presets.circular.l);
  assert.ok(Math.max(...t.states.map((s) => Math.abs(s[0] - 10))) < 1e-9);
});
void test('precession orbit is bound and conserves energy', () => {
  const t = trajectory(14, 3.8);
  assert.equal(t.captured, false);
  assert.ok(Math.min(...t.states.map((s) => s[0])) > 6);
  assert.ok(t.error < 1e-8);
  const peri = t.states.filter(
    (s, i, a) =>
      i > 0 && i < a.length - 1 && s[0] < a[i - 1][0] && s[0] < a[i + 1][0],
  );
  assert.ok(peri.length >= 2);
  assert.ok(peri[1][2] - peri[0][2] > 2 * Math.PI);
});
void test('low angular momentum plunges and energy converges', () => {
  const a = trajectory(12, 3.2, true, 18000, 0.08),
    b = trajectory(12, 3.2, true, 36000, 0.04);
  assert.ok(a.captured && b.captured);
  assert.ok(b.error < a.error);
  assert.ok(a.error < 1e-5);
});
void test('step refinement agrees for bound orbit', () => {
  const a = trajectory(14, 3.8, true, 5000, 0.08),
    b = trajectory(14, 3.8, true, 10000, 0.04);
  const x = a.states.at(-1)!,
    y = b.states.at(-1)!;
  assert.ok(Math.abs(x[0] - y[0]) < 1e-7);
  assert.ok(Math.abs(x[2] - y[2]) < 1e-7);
});
console.log(
  'Reference diagnostics',
  Object.fromEntries(
    Object.entries(presets).map(([k, p]) => {
      const t = trajectory(p.r, p.l);
      return [
        k,
        {
          energySquaredDrift: t.error,
          captured: t.captured,
          minRadius: Math.min(...t.states.map((s) => s[0])),
        },
      ];
    }),
  ),
);
