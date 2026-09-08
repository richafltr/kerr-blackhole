import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lightStep, traceLight } from '../lib/light.ts';
void test('analytic Schwarzschild capture threshold', () => {
  const critical = 3 * Math.sqrt(3);
  assert.equal(traceLight(critical * 0.99).status, 'captured');
  assert.equal(traceLight(critical * 1.01).status, 'escaped');
});
void test('photon sphere is a fixed orbit at r=3M', () => {
  let u = 1 / 3,
    q = 0;
  for (let i = 0; i < 650; i++) [u, q] = lightStep(u, q, 0.012);
  assert.ok(Math.abs(u - 1 / 3) < 1e-12);
});
void test('escaping ray conserves invariant and converges', () => {
  const a = traceLight(6),
    b = traceLight(6, 0.006, 1300);
  assert.equal(a.status, 'escaped');
  assert.ok(a.drift < 1e-7);
  assert.ok(Math.abs(a.phi - b.phi) < 1e-5);
});
console.log(
  'Photon reference',
  [5.1, 5.3, 6, 10].map((b) => ({ b, ...traceLight(b) })),
);
