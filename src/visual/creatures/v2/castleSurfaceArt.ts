/** Castle art-directed material fields. Neutral multipliers, not painted lighting. */
export type CastleSurfaceRole =
  'velvet' | 'satin' | 'wornLeather' | 'agedGold' | 'spectralSkin' | 'brocade' | 'ivoryLinen' | 'hair';
export interface CastleSurfaceSample {
  color: [number, number, number];
  height: number;
  roughness: number;
  metalness: number;
  occlusion: number;
}
const tau = Math.PI * 2;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
/** Periodic woven foliate medallion with a central stem and four paired leaves. */
function damask(u: number, v: number): number {
  u = u - Math.floor(u);
  v = v - Math.floor(v);
  const x = u - 0.5,
    y = v - 0.5;
  const diamond = Math.abs(Math.abs(x) + Math.abs(y) - 0.36);
  let f = 0.48 * Math.exp(-((diamond / 0.017) ** 2));
  f += 0.7 * Math.exp(-((x / 0.013) ** 2) - (y / 0.31) ** 8);
  for (const side of [-1, 1])
    for (const row of [-1, 1]) {
      const dx = x - side * 0.115,
        dy = y - row * 0.12;
      const along = dx * side * 0.75 + dy * row * 0.66,
        across = -dx * side * 0.66 + dy * row * 0.75;
      const ellipse = (along / 0.13) ** 2 + (across / 0.047) ** 2;
      f += Math.exp(-(((ellipse - 1) / 0.21) ** 2)) * 0.65;
    }
  return clamp(f);
}
export function castleSurfaceSample(role: CastleSurfaceRole, u: number, v: number): CastleSurfaceSample {
  const warp = Math.sin(tau * u * 32),
    weft = Math.sin(tau * v * 32);
  const weave = warp * weft * 0.5 + 0.5;
  const fine = Math.sin(tau * (u * 61 + v * 47)) * Math.sin(tau * (u * 37 - v * 59)) * 0.5 + 0.5;
  const broad = (Math.sin(tau * (u * 3 + v * 2)) + Math.cos(tau * (u * 5 - v * 3))) * 0.25 + 0.5;
  let shade = 0.96,
    height = 0.005 * (weave - 0.5),
    roughness = 0.8,
    metalness = 0;
  let color: [number, number, number] = [shade, shade, shade];
  if (role === 'velvet') {
    shade = 0.95 + 0.035 * weave;
    height = 0.006 * (weave - 0.5);
    roughness = 0.86 + 0.1 * fine;
    color = [shade, shade, shade];
  } else if (role === 'satin') {
    shade = 0.94 + 0.045 * warp * 0.5;
    height = 0.007 * warp + 0.002 * (fine - 0.5);
    roughness = 0.55 + 0.12 * weave;
    color = [shade, shade, shade];
  } else if (role === 'wornLeather') {
    shade = 0.88 + 0.09 * broad + 0.02 * fine;
    height = 0.009 * (fine - 0.5) + 0.004 * Math.sin(tau * u * 7) * Math.sin(tau * v * 9);
    roughness = 0.43 + 0.18 * (1 - broad);
    color = [shade, shade * 0.99, shade * 0.98];
  } else if (role === 'agedGold') {
    const patina = clamp((broad - 0.62) * 2.1);
    shade = 0.9 + 0.07 * fine;
    height = 0.003 * (fine - 0.5);
    roughness = 0.28 + 0.23 * patina;
    metalness = 0.97 - 0.12 * patina;
    color = [shade, shade * (0.94 - 0.05 * patina), shade * (0.81 - 0.08 * patina)];
  } else if (role === 'spectralSkin') {
    shade = 0.98 + 0.015 * fine;
    height = 0.0015 * (fine - 0.5);
    roughness = 0.52 + 0.08 * fine;
    color = [shade, shade * 0.99, shade];
  } else if (role === 'brocade') {
    const stitch = damask(u, v);
    height = 0.05 * stitch + 0.004 * (weave - 0.5);
    roughness = 0.77 - 0.13 * stitch;
    color = [0.095 + 0.33 * stitch, 0.09 + 0.25 * stitch, 0.11 + 0.14 * stitch];
    metalness = 0.32 * stitch;
  } else if (role === 'ivoryLinen') {
    shade = 0.94 + 0.04 * weave;
    height = 0.011 * (weave - 0.5);
    roughness = 0.82 + 0.08 * fine;
    color = [shade, shade, shade * 0.99];
  } else if (role === 'hair') {
    const strand = Math.sin(tau * (u * 35 + Math.sin(tau * v) * 0.6));
    shade = 0.92 + 0.045 * strand;
    height = 0.009 * strand + 0.012 * Math.sin(tau * (u * 8 + v * 0.25));
    roughness = 0.68 + 0.1 * fine;
    color = [shade, shade, shade];
  }
  return { color, height, roughness, metalness, occlusion: 1 };
}
