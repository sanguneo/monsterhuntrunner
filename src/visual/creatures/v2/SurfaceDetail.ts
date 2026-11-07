import * as THREE from 'three';

export type SurfacePreset =
  | 'velvet'
  | 'satin'
  | 'wornLeather'
  | 'agedGold'
  | 'spectralSkin'
  | 'brocade'
  | 'ivoryLinen'
  | 'hair'
  | 'paper'
  | 'wood'
  | 'lacquer'
  | 'bone'
  | 'rubber'
  | 'brushedMetal'
  | 'ceramic'
  | 'wetSkin'
  | 'scales'
  | 'feather';
export type SurfaceKey = SurfacePreset | `${SurfacePreset}/${string}`;
export interface SurfaceSample {
  color: readonly [number, number, number];
  height: number;
  roughness: number;
  metalness: number;
  occlusion?: number;
}
export type SurfaceSampler = (u: number, v: number) => SurfaceSample;
export interface SurfaceOptions {
  color?: THREE.ColorRepresentation;
  roughness?: number;
  metalness?: number;
  normalStrength?: number;
  sheen?: number;
  sheenColor?: THREE.ColorRepresentation;
  sheenRoughness?: number;
  patternScale?: number;
  embroideryStrength?: number;
}
type Maps = { baseColor: THREE.DataTexture; normal: THREE.DataTexture; orm: THREE.DataTexture };
const SIZE = 128;
const maps = new Map<string, Maps>();
const samplers = new Map<SurfaceKey, SurfaceSampler>();
const samplerSizes = new Map<SurfaceKey, 128 | 256>();
const allTextures = new Set<THREE.DataTexture>();
const TAU = Math.PI * 2;
const clamp = (x: number) => THREE.MathUtils.clamp(x, 0, 1);
const wave = (u: number, n: number) => Math.sin(TAU * n * u);
const hash = (u: number, v: number) => {
  const x = Math.sin(Math.floor(u * SIZE) * 127.1 + Math.floor(v * SIZE) * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Register an artist-authored seamless height/color/ORM field before this preset is first used. */
export function registerSurfaceSampler(preset: SurfaceKey, sample: SurfaceSampler, tileSize: 128 | 256 = 128): void {
  if (maps.has(preset)) throw new Error(`Surface ${preset} already cached; register its artwork before prewarming`);
  samplers.set(preset, sample);
  samplerSizes.set(preset, tileSize);
}
function sampleDefault(role: SurfacePreset, u: number, v: number): SurfaceSample {
  u = ((u % 1) + 1) % 1;
  v = ((v % 1) + 1) % 1;
  const grain = hash(u, v) - 0.5;
  const weave = wave(u, 48) * wave(v, 48);
  let height = 0.005 * grain,
    tone = 0.93 + 0.025 * grain,
    roughness = 0.7,
    metalness = 0;
  if (role === 'velvet') {
    height += 0.006 * weave;
    tone += 0.035 * wave(v, 8);
    roughness = 0.78 + 0.05 * grain;
  }
  if (role === 'satin') {
    height += 0.004 * wave(u + v * 0.2, 48);
    tone += 0.025 * wave(v, 12);
    roughness = 0.36 + 0.05 * weave;
  }
  if (role === 'wornLeather') {
    const crease = Math.pow(Math.max(0, Math.cos(TAU * (u * 5 + 0.22 * wave(v, 3)))), 24);
    height += 0.018 * grain - 0.025 * crease;
    tone -= 0.1 * crease;
    roughness = 0.56 + 0.13 * grain;
  }
  if (role === 'agedGold') {
    const patina = 0.5 + 0.5 * wave(u, 3) * wave(v, 4);
    height += 0.008 * grain;
    tone = 0.8 + 0.15 * patina + 0.025 * grain;
    roughness = 0.3 + 0.2 * (1 - patina);
    metalness = 0.88;
  }
  if (role === 'spectralSkin') {
    height = 0.002 * grain;
    tone = 0.96 + 0.025 * wave(u, 2) * wave(v, 2);
    roughness = 0.58 + 0.025 * grain;
  }
  if (role === 'brocade') {
    // Repeating woven diamonds and foliate lobes, not random grunge over an unshaped garment.
    const x = ((u * 6) % 1) - 0.5,
      y = ((v * 8) % 1) - 0.5;
    const diamond = Math.exp(-Math.pow((Math.abs(x) + Math.abs(y) - 0.34) / 0.028, 2));
    const leaf =
      Math.exp(-Math.pow((Math.hypot(x * 1.7, y) - 0.22) / 0.035, 2)) * Math.pow(Math.cos(Math.atan2(y, x) * 2), 2);
    const motif = Math.max(diamond, leaf);
    height += 0.032 * motif + 0.004 * weave;
    tone = 0.83 + 0.13 * motif + 0.015 * grain;
    roughness = 0.64 - 0.18 * motif;
  }
  if (role === 'ivoryLinen') {
    height += 0.012 * weave;
    tone = 0.94 + 0.025 * weave + 0.012 * grain;
    roughness = 0.86 + 0.035 * grain;
  }
  if (role === 'hair') {
    height += 0.018 * wave(u + 0.012 * wave(v, 2), 40);
    tone = 0.86 + 0.09 * wave(u, 40);
    roughness = 0.42 + 0.05 * grain;
  }
  const warmth = role === 'spectralSkin' ? 0.012 * wave(v, 2) : 0;
  return {
    color: [tone + warmth, tone, tone - warmth],
    height,
    roughness,
    metalness,
    occlusion: 1 - Math.max(0, -height) * 1.5,
  };
}
function texture(data: Uint8Array, label: string, color = false): THREE.DataTexture {
  // Exact lossless constant-field compaction: every texel must match all four bytes.
  // This preserves every sampled value while avoiding full atlases for uniform ORM/normal fields.
  const constant = data.every((value, index) => value === data[index % 4]);
  const dimension = constant ? 1 : Math.sqrt(data.length / 4);
  const map = new THREE.DataTexture(
    new Uint8Array(constant ? data.subarray(0, 4) : data),
    dimension,
    dimension,
    THREE.RGBAFormat,
  );
  map.name = label;
  map.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = !constant;
  map.flipY = false;
  map.userData.sharedCreatureTexture = true;
  map.needsUpdate = true;
  allTextures.add(map);
  return map;
}
function getMaps(role: SurfaceKey, patternScale = 1): Maps {
  const key = `${role}:${patternScale}`;
  const size = samplerSizes.get(role) ?? SIZE;
  if (maps.has(key)) return maps.get(key)!;
  if (!maps.has(role)) {
    const base = new Uint8Array(size * size * 4),
      normal = new Uint8Array(base.length),
      orm = new Uint8Array(base.length);
    const sample =
      samplers.get(role) ?? ((u: number, v: number) => sampleDefault(role.split('/')[0] as SurfacePreset, u, v));
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const u = (x + 0.5) / size,
          v = (y + 0.5) / size,
          p = (y * size + x) * 4,
          s = sample(u, v);
        const dx = (sample(u + 1 / size, v).height - sample(u - 1 / size, v).height) * size * 0.5;
        const dy = (sample(u, v + 1 / size).height - sample(u, v - 1 / size).height) * size * 0.5;
        if (![...s.color, s.height, s.roughness, s.metalness, s.occlusion ?? 1, dx, dy].every(Number.isFinite))
          throw new Error(`Non-finite authored surface sample: ${role} at ${u},${v}`);
        const n = new THREE.Vector3(-dx * 0.07, -dy * 0.07, 1).normalize();
        for (let c = 0; c < 3; c++) base[p + c] = Math.round(clamp(s.color[c]) * 255);
        normal[p] = Math.round((n.x * 0.5 + 0.5) * 255);
        normal[p + 1] = Math.round((n.y * 0.5 + 0.5) * 255);
        normal[p + 2] = Math.round((n.z * 0.5 + 0.5) * 255);
        orm[p] = Math.round(clamp(s.occlusion ?? 1) * 255);
        orm[p + 1] = Math.round(clamp(s.roughness) * 255);
        orm[p + 2] = Math.round(clamp(s.metalness) * 255);
        base[p + 3] = normal[p + 3] = orm[p + 3] = 255;
      }
    maps.set(role, {
      baseColor: texture(base, role + '-color', true),
      normal: texture(normal, role + '-normal'),
      orm: texture(orm, role + '-ORM'),
    });
  }
  const original = maps.get(role)!;
  if (patternScale === 1) {
    maps.set(key, original);
    return original;
  }
  const scaled = Object.fromEntries(
    Object.entries(original).map(([name, map]) => {
      const copy = map.clone();
      copy.repeat.setScalar(patternScale);
      allTextures.add(copy);
      return [name, copy];
    }),
  ) as Maps;
  maps.set(key, scaled);
  return scaled;
}

/** Call once per model-local role/color, then reuse that material across its authored pieces. */
export function createSurfaceMaterial(preset: SurfaceKey, options: SurfaceOptions = {}): THREE.MeshPhysicalMaterial {
  const atlas = getMaps(preset, options.patternScale ?? 1);
  const basePreset = preset.split('/')[0] as SurfacePreset;
  const material = new THREE.MeshPhysicalMaterial({
    color: options.color ?? 0xffffff,
    map: atlas.baseColor,
    normalMap: atlas.normal,
    roughnessMap: atlas.orm,
    metalnessMap: atlas.orm,
    aoMap: atlas.orm,
    roughness: options.roughness ?? 1,
    metalness: options.metalness ?? 1,
    aoMapIntensity: 0.35,
    sheen: options.sheen ?? (basePreset === 'velvet' ? 0.55 : basePreset === 'satin' ? 0.25 : 0),
    sheenColor: options.sheenColor ?? 0xa4a0ad,
    sheenRoughness: options.sheenRoughness ?? 0.65,
  });
  material.name = `authored-${preset}`;
  material.normalScale.setScalar((options.normalStrength ?? 0.45) * (options.embroideryStrength ?? 1));
  material.userData.surfacePreset = preset;
  material.userData.sharedImmutableMaps = true;
  return material;
}
export function applySurfaceUV(geometry: THREE.BufferGeometry, preset: SurfaceKey, scaleU = 1, scaleV = 1): void {
  const uv = geometry.getAttribute('uv');
  if (!uv) throw new Error(`Authored ${preset} surface requires UV coordinates`);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * scaleU, uv.getY(i) * scaleV);
  uv.needsUpdate = true;
  geometry.userData.surfacePreset = preset;
}
/** External baked maps join the same cache-owned lifetime and measured budget. */
export function registerSharedCreatureTexture<T extends THREE.DataTexture>(map: T): T {
  map.userData.sharedCreatureTexture = true;
  allTextures.add(map);
  return map;
}
export const CREATURE_TEXTURE_BUDGET_BYTES = 24 * 1024 * 1024;
export function surfaceDetailStats() {
  const sources = new Set([...allTextures].map((map) => map.source));
  let rawPixelBytes = 0,
    estimatedMipBytes = 0;
  for (const source of sources) {
    const image = source.data as { data?: ArrayBufferView; width?: number; height?: number };
    const bytes = image.data?.byteLength ?? (image.width ?? 0) * (image.height ?? 0) * 4;
    const mip = [...allTextures].some((map) => map.source === source && map.generateMipmaps);
    rawPixelBytes += bytes;
    estimatedMipBytes += Math.ceil(bytes * (mip ? 4 / 3 : 1));
  }
  return {
    textureObjects: allTextures.size,
    uniqueImages: sources.size,
    rawPixelBytes,
    estimatedMipBytes,
    budgetBytes: CREATURE_TEXTURE_BUDGET_BYTES,
    defaultRoleTileSize: SIZE,
    maxAuthoredRoleTileSize: Math.max(SIZE, ...samplerSizes.values()),
  };
}
/** Teardown only after all scene/template users are discarded. Encounter disposal must NOT call this. */
export function disposeSurfaceDetailCache(): void {
  allTextures.forEach((map) => map.dispose());
  allTextures.clear();
  maps.clear();
}
