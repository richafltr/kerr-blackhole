import { makeCamera } from './camera.ts';
import { kerrField } from './kerr.ts';
export const SOLAR_GM = 1.3271244e20;
export const LIGHT_SPEED = 299792458;
export const MASS_SUNS = 1e8;
export const PROBE_SPAN_M = 10;
export function physicalScale(massSuns = MASS_SUNS) {
  const length = (SOLAR_GM * massSuns) / LIGHT_SPEED ** 2;
  return { length, time: length / LIGHT_SPEED };
}
// Static, supported observer outside the ergosphere; t agrees with proper time at infinity.
export function staticClockRate(
  radius: number,
  inclination: number,
  spin: number,
) {
  const camera = makeCamera(radius, inclination, spin);
  return Math.sqrt(1 - 2 * kerrField(camera.position, spin).h);
}
export function clockDisplay(seconds: number) {
  const whole = Math.floor(seconds);
  return `${String(Math.floor(whole / 3600)).padStart(2, '0')}:${String(Math.floor(whole / 60) % 60).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

export function probePixelSpan(distanceM: number, viewportHeight: number) {
  return (PROBE_SPAN_M * viewportHeight) / (0.76 * distanceM);
}
