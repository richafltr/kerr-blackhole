import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCamera } from '../lib/camera.ts';
import { releaseProbe, stepFlight, flightCamera } from '../lib/flight.ts';
import { tidalTensor, tidalEigenvalues, tidalStretch } from '../lib/tides.ts';
void test('Schwarzschild tidal spectrum agrees with exact radial stretch and transverse compression', () => {
  for (const r of [2.5, 6, 30]) {
    const eigen = tidalEigenvalues(tidalTensor(makeCamera(r, 77, 0), 0));
    [-1, -1, 2].forEach((v, i) =>
      assert.ok(Math.abs(eigen[i] * r ** 3 - v) < 2e-5),
    );
  }
  const f = stepFlight(releaseProbe(30, 77, 0), 175);
  const eigen = tidalEigenvalues(tidalTensor(flightCamera(f), 0));
  [-1, -1, 2].forEach((v, i) =>
    assert.ok(Math.abs(eigen[i] * f.radius ** 3 - v) < 2e-5),
  );
});
void test('Kerr tidal tensor is symmetric and vacuum trace-free across the exterior descent', () => {
  for (const spin of [-0.9, 0.6, 0.9])
    for (const time of [0, 150, 250]) {
      const f = stepFlight(releaseProbe(30, 77, spin), time),
        t = tidalTensor(flightCamera(f), spin);
      const scale = Math.max(...t.flat().map(Math.abs));
      assert.ok(Math.abs(t[0][0] + t[1][1] + t[2][2]) / scale < 2e-5);
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
          assert.ok(Math.abs(t[i][j] - t[j][i]) / scale < 2e-5);
    }
});
void test('Kerr curvature finite differences converge and physical tides scale as inverse mass squared', () => {
  const f = stepFlight(releaseProbe(30, 77, 0.9), 250),
    camera = flightCamera(f);
  const t1 = tidalTensor(camera, 0.9, 8e-4),
    t2 = tidalTensor(camera, 0.9, 4e-4),
    t3 = tidalTensor(camera, 0.9, 2e-4);
  const difference = (a: number[][], b: number[][]) =>
    Math.hypot(...a.flatMap((row, i) => row.map((v, j) => v - b[i][j])));
  assert.ok(difference(t1, t2) > 3.8 * difference(t2, t3));
  assert.ok(
    Math.abs(
      tidalStretch(camera, 0.9, 2, 2e8) / tidalStretch(camera, 0.9, 2, 1e8) -
        0.25,
    ) < 1e-12,
  );
});

void test('Kerr polar limit agrees with the independent analytic on-axis tidal spectrum', () => {
  // Lima Junior et al., arXiv:2003.09506. A small nonzero angle avoids the camera's axis chart degeneracy.
  for (const spin of [-0.9, 0.6, 0.9])
    for (const r of [2.5, 6, 30]) {
      const k = (r * (r * r - 3 * spin * spin)) / (r * r + spin * spin) ** 3;
      const eigen = tidalEigenvalues(
        tidalTensor(makeCamera(r, 0.001, spin), spin),
      );
      [-1, -1, 2].forEach((v, i) =>
        assert.ok(Math.abs(eigen[i] / k - v) < 2e-6),
      );
    }
});
