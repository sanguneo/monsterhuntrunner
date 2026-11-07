import * as THREE from 'three';
import { createSurfaceMaterial, registerSurfaceSampler, type SurfaceKey } from './SurfaceDetail';
import { applyZombieFidelityMaterials } from './zombieFidelityMaterials';
import { authorHardSurfaceCharts } from './zombieLabCharts';
const tau = Math.PI * 2,
  fur: SurfaceKey = 'hair/zombie-hound-fur',
  ear: SurfaceKey = 'hair/zombie-hound-ear',
  cover: SurfaceKey = 'feather/crow-coverts',
  flight: SurfaceKey = 'feather/crow-flight',
  beak: SurfaceKey = 'bone/crow-keratin';
let registered = false;
function register(): void {
  if (registered) return;
  for (const [key, brown] of [
    [fur, false],
    [ear, true],
  ] as const)
    registerSurfaceSampler(key, (u, v) => {
      const strands = Math.sin(tau * (u * 37 + 0.13 * Math.sin(tau * v * 4))),
        groups = Math.sin(tau * (u * 7 + 0.2 * v)) * Math.sin(tau * v * 5),
        tone = 1 + 0.055 * groups + 0.025 * strands;
      return {
        color: (brown ? [0.13 * tone, 0.125 * tone, 0.075 * tone] : [0.16 * tone, 0.205 * tone, 0.095 * tone]) as [
          number,
          number,
          number,
        ],
        height: 0.006 * strands + 0.009 * groups,
        roughness: 0.84 + 0.025 * strands,
        metalness: 0,
      };
    });
  for (const [key, primary] of [
    [cover, false],
    [flight, true],
  ] as const)
    registerSurfaceSampler(key, (u, v) => {
      const shaft = Math.exp(-Math.pow(Math.sin(tau * u) / 0.12, 2)),
        barbs = Math.sin(tau * (v * 42 + Math.abs(Math.sin(tau * u)) * 4)),
        tone = 1 + 0.035 * barbs + 0.06 * shaft;
      return {
        color: [(primary ? 0.036 : 0.025) * tone, (primary ? 0.047 : 0.033) * tone, (primary ? 0.066 : 0.048) * tone],
        height: 0.004 * barbs + 0.009 * shaft,
        roughness: (primary ? 0.45 : 0.67) + 0.025 * barbs,
        metalness: 0,
      };
    });
  registerSurfaceSampler(beak, (u, v) => {
    const line = Math.sin(tau * u * 28) * Math.sin(tau * v * 2),
      t = 1 + 0.025 * line;
    return { color: [0.12 * t, 0.14 * t, 0.155 * t], height: 0.0025 * line, roughness: 0.36, metalness: 0 };
  });
  registered = true;
}
export function applyAnimalFidelityMaterials(group: THREE.Group): void {
  register();
  if (group.name === 'zombieDog') applyZombieFidelityMaterials(group);
  const replacements = new Map<THREE.Material, THREE.Material>();
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
    const old = o.material as THREE.MeshStandardMaterial,
      color = old.color.getHex();
    let role: SurfaceKey | undefined;
    if (group.name === 'zombieDog') {
      if (color === 0x74815a) role = fur;
      if (color === 0x5d6247) role = ear;
    } else {
      if (color === 0x252d39) role = cover;
      if (color === 0x333d4a) role = flight;
      if (color === 0x4c5359) role = beak;
    }
    if (!role) return;
    authorHardSurfaceCharts(o);
    let mat = replacements.get(old);
    if (!mat) {
      mat = createSurfaceMaterial(role, {
        normalStrength: role === fur || role === ear ? 0.28 : 0.22,
        sheen: role === cover || role === flight ? 0.18 : 0,
        sheenColor: 0x384b68,
      });
      mat.side = old.side;
      replacements.set(old, mat);
    }
    o.material = mat;
  });
  replacements.forEach((_, old) => old.dispose());
}
