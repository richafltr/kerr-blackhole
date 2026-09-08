import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeCamera, cameraRay, isco } from '../lib/camera.ts';
import { hamiltonian, kerrField } from '../lib/kerr.ts';
import { traceTransport } from '../lib/transport.ts';
void test('static tetrad rays are null with observed unit frequency', () => {
  for (const a of [-0.8, 0, 0.8]) {
    const c = makeCamera(30, 77, a);
    assert.ok(Math.abs(kerrField(c.position, a).r - 30) < 1e-12);
    for (const [x, y] of [
      [0, 0],
      [1, 0.5],
      [-1, -0.5],
    ]) {
      const r = cameraRay(c, x, y);
      assert.ok(r.pt > 0);
      assert.ok(Math.abs(hamiltonian(r.state, r.pt, a)) < 1e-13);
      const ut = 1 / Math.sqrt(1 - 2 * kerrField(c.position, a).h);
      assert.ok(Math.abs(r.pt * ut - 1) < 1e-13);
    }
  }
});
void test('ISCO analytic values and signed spin', () => {
  assert.equal(isco(0), 6);
  assert.ok(isco(0.8) < 6);
  assert.ok(isco(-0.8) > 6);
});
void test('camera transport resolves representative disk, shadow and background rays', () => {
  const c = makeCamera(30, 77, 0.6);
  const samples = [
    [0, 0],
    [0.8, 0],
    [0, 0.8],
    [-0.8, -0.5],
    [1.5, 0.8],
  ];
  const statuses = samples.map(([x, y]) => {
    const r = cameraRay(c, x, y);
    return traceTransport(r.state, r.pt, 0.6).status;
  });
  assert.ok(statuses.includes(0));
  assert.ok(statuses.includes(1));
  assert.ok(statuses.includes(2));
  assert.ok(!statuses.includes(4));
});
void test('disk intersection and frequency shift converge', () => {
  const c = makeCamera(30, 77, 0.6),
    r = cameraRay(c, 0.8, 0),
    a = traceTransport(r.state, r.pt, 0.6),
    b = traceTransport(r.state, r.pt, 0.6, 0.5);
  assert.equal(a.status, 1);
  assert.equal(b.status, 1);
  assert.ok(Math.hypot(a.data[0] - b.data[0], a.data[1] - b.data[1]) < 0.005);
  assert.ok(Math.abs(a.data[2] - b.data[2]) < 0.001);
});
