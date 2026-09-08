import test from 'node:test';
import assert from 'node:assert/strict';
import {
  physicalScale,
  staticClockRate,
  probePixelSpan,
} from '../lib/mission.ts';
void test('physical lengths and times scale linearly with black-hole mass', () => {
  const solar = physicalScale(1),
    giant = physicalScale(1e8);
  assert.ok(Math.abs(solar.length - 1476.625) < 0.001);
  assert.ok(Math.abs(giant.time - 492.549) < 0.001);
  assert.equal(giant.length / solar.length, 1e8);
});
void test('supported Schwarzschild clock agrees with exact static redshift', () => {
  for (const radius of [24, 30, 55])
    for (const inclination of [30, 77, 88]) {
      assert.ok(
        Math.abs(
          staticClockRate(radius, inclination, 0) - Math.sqrt(1 - 2 / radius),
        ) < 1e-14,
      );
    }
});
void test('Kerr static clock is finite and slower than infinity throughout exposed controls', () => {
  for (const spin of [-0.9, 0, 0.9])
    for (const radius of [24, 55])
      for (const inclination of [30, 88]) {
        const rate = staticClockRate(radius, inclination, spin);
        assert.ok(rate > 0 && rate < 1);
      }
});

void test('a ten metre probe is subpixel at ten thousand kilometres', () => {
  assert.ok(probePixelSpan(1e7, 1080) < 0.002);
  assert.ok(probePixelSpan(25, 1080) > 500);
});
