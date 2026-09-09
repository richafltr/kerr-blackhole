/** Order-two spherical harmonics of the traced sky, in the carried local frame.
 * Diffuse lighting approximation; no cavity occlusion or spectral material transport.
 */
export type SkyLight = {
  coefficients: number[][];
  direction: number[];
  color: number[];
};
export function skyDirection(x: number, y: number, w: number, h: number) {
  const phi = ((x + 0.5) / w - 0.5) * 2 * Math.PI,
    latitude = ((y + 0.5) / h - 0.5) * Math.PI;
  return [
    Math.sin(phi) * Math.cos(latitude),
    Math.sin(latitude),
    -Math.cos(phi) * Math.cos(latitude),
  ];
}
export function integrateSky(
  data: Float32Array,
  w: number,
  h: number,
): SkyLight {
  const coefficients = Array.from({ length: 9 }, () => [0, 0, 0]);
  let brightest = 0,
    direction = [0, 1, -1],
    color = [0.1, 0.08, 0.06];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = skyDirection(x, y, w, h),
        [dx, dy, dz] = d;
      const weight =
        ((2 * Math.PI) / w) *
        (Math.sin(((y + 1) / h - 0.5) * Math.PI) -
          Math.sin((y / h - 0.5) * Math.PI));
      const basis = [
        0.282095,
        0.488603 * dy,
        0.488603 * dz,
        0.488603 * dx,
        1.092548 * dx * dy,
        1.092548 * dy * dz,
        0.315392 * (3 * dz * dz - 1),
        1.092548 * dx * dz,
        0.546274 * (dx * dx - dy * dy),
      ];
      const rgb = [0, 1, 2].map((c) =>
        Math.max(0, Math.min(100, data[(y * w + x) * 4 + c] || 0)),
      );
      for (let j = 0; j < 9; j++)
        for (let c = 0; c < 3; c++)
          coefficients[j][c] += rgb[c] * basis[j] * weight;
      const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      if (luminance > brightest) {
        brightest = luminance;
        direction = d;
        color = rgb;
      }
    }
  return { coefficients, direction, color };
}
