import * as THREE from 'three';
import { createSurfaceMaterial, registerSurfaceSampler, type SurfaceKey, type SurfaceSample } from './SurfaceDetail';
const tau = Math.PI * 2;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const line = (v: number, width: number) => Math.exp(-((v / width) ** 2));
/** Original bone-grain, armor-engraving and royal funerary embroidery; no baked lighting. */
function sample(role: string, u: number, v: number): SurfaceSample {
  const grain = Math.sin(tau * (u * 29 + Math.sin(tau * v) * 0.3)) * Math.sin(tau * (v * 31 - u * 3));
  const broad = (Math.sin(tau * (u * 3 + v)) + Math.sin(tau * (u - v * 2))) * 0.25 + 0.5;
  if (role === 'bone') {
    const joint = Math.pow(Math.abs(Math.cos(Math.PI * v)), 10),
      streak = Math.sin(tau * (u * 17 + 0.2 * Math.sin(tau * v * 2)));
    return {
      color: [
        0.77 - 0.13 * joint + 0.035 * broad,
        0.68 - 0.15 * joint + 0.03 * broad,
        0.49 - 0.12 * joint + 0.025 * broad,
      ],
      height: 0.003 * grain + 0.006 * streak,
      roughness: 0.54 + 0.13 * joint + 0.035 * grain,
      metalness: 0,
      occlusion: 1,
    };
  }
  if (role === 'armor') {
    const edge = Math.max(line(Math.min(u, 1 - u) - 0.055, 0.014), line(Math.min(v, 1 - v) - 0.055, 0.014));
    const chevron = line(Math.abs(u - 0.5) - (0.1 + 0.22 * (1 - v)), 0.009) * Math.pow(Math.sin(Math.PI * v), 2);
    const etch = clamp(edge * 0.8 + chevron * 0.35),
      patina = clamp((broad - 0.6) * 2);
    return {
      color: [0.23 + 0.28 * etch, 0.25 + 0.2 * etch, 0.3 + 0.1 * etch],
      height: 0.014 * etch + 0.0015 * grain,
      roughness: 0.56 + 0.16 * patina - 0.12 * etch,
      metalness: 0.82 - 0.16 * patina,
      occlusion: 1,
    };
  }
  if (role === 'gold') {
    const tarnish = clamp((broad - 0.45) * 1.5);
    return {
      color: [0.64 - 0.14 * tarnish, 0.43 - 0.12 * tarnish, 0.15 - 0.045 * tarnish],
      height: 0.0025 * grain,
      roughness: 0.27 + 0.24 * tarnish,
      metalness: 0.91 - 0.12 * tarnish,
      occlusion: 1,
    };
  }
  if (role === 'royal') {
    const x = (u - 0.5) * 2.6,
      y = (v - 0.55) * 2.6;
    let emblem = line(x, 0.014) * Math.exp(-((y / 0.25) ** 8));
    for (const row of [-0.14, -0.02, 0.1])
      emblem += line(y - row + 0.23 * Math.abs(x), 0.014) * Math.exp(-((x / 0.17) ** 8));
    const border = Math.max(line(v - 0.045, 0.009), line(Math.min(u, 1 - u) - 0.025, 0.007));
    const stitch = clamp(emblem * 0.6 + border * 0.65),
      weave = Math.sin(tau * u * 40) * Math.sin(tau * v * 40);
    return {
      color: [0.065 + 0.23 * stitch, 0.025 + 0.16 * stitch, 0.115 + 0.055 * stitch],
      height: 0.018 * stitch + 0.002 * weave,
      roughness: 0.82 - 0.23 * stitch,
      metalness: 0.38 * stitch,
      occlusion: 1,
    };
  }
  const shaft = line(u - 0.5, 0.017),
    barb = Math.pow(Math.max(0, Math.cos(tau * (v * 24 + Math.abs(u - 0.5) * 9))), 12),
    edge = Math.pow(Math.abs(u - 0.5) * 2, 4);
  return {
    color: [
      0.18 + 0.1 * shaft + 0.035 * barb,
      0.105 + 0.08 * shaft + 0.025 * barb,
      0.255 + 0.12 * shaft + 0.045 * barb,
    ],
    height: 0.025 * shaft + 0.006 * barb,
    roughness: 0.49 + 0.17 * edge,
    metalness: 0,
    occlusion: 1,
  };
}
const keys: Record<string, SurfaceKey> = {
  bone: 'bone/skull-ivory',
  armor: 'brushedMetal/skull-engraved',
  gold: 'agedGold/skull-regalia',
  royal: 'brocade/skull-funerary',
  feather: 'feather/skull-avian',
};
for (const [role, key] of Object.entries(keys)) registerSurfaceSampler(key, (u, v) => sample(role, u, v));
export function dressSkullBody(group: THREE.Group): THREE.Group {
  const materials = new Map<string, THREE.MeshPhysicalMaterial>(),
    replaced = new Set<THREE.Material>();
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
    const old = o.material as THREE.MeshStandardMaterial;
    if (old.name.startsWith('authored-ivory-') || !old.color) return;
    const c = old.color.getHex();
    let role: string | undefined;
    if (c === 0xd8cdb1) role = 'bone';
    else if (c === 0x48505c || c === 0xb6bbc0) role = 'armor';
    else if (c === 0xa4824d) role = 'gold';
    else if (c === 0x55405f) role = 'royal';
    else if ([0x51435e, 0x66546e, 0x71647c].includes(c)) role = 'feather';
    if (!role) return;
    let material = materials.get(role);
    if (!material) {
      material = createSurfaceMaterial(keys[role], {
        color: 0xffffff,
        normalStrength: role === 'royal' ? 0.3 : 0.16,
        sheen: role === 'royal' ? 0.12 : 0,
        sheenColor: 0x573064,
      });
      material.name = 'skull-authored-body-' + role;
      materials.set(role, material);
    }
    o.material = material;
    replaced.add(old);
  });
  // Material instances belong to this model; their immutable maps belong to the shared cache.
  group.traverse((o) => {
    if (o instanceof THREE.Mesh)
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) replaced.delete(m);
  });
  for (const material of replaced) material.dispose();
  return group;
}
