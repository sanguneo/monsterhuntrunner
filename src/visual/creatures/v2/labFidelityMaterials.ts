import * as THREE from 'three';
import { createSurfaceMaterial, registerSurfaceSampler, type SurfaceKey } from './SurfaceDetail';
import { authorHardSurfaceCharts, authorFrontPanelCharts } from './zombieLabCharts';
const tau = Math.PI * 2,
  steel: SurfaceKey = 'brushedMetal/lab-painted-steel',
  hazard: SurfaceKey = 'brushedMetal/lab-hazard-panels',
  rubber: SurfaceKey = 'rubber/lab-insulated-braid';
let registered = false;
function register(): void {
  if (registered) return;
  const paint = (u: number, v: number, marked: boolean) => {
    const brushed = Math.sin(tau * v * 55) * 0.5 + 0.5 * Math.sin(tau * v * 39),
      edge = Math.pow(Math.abs(Math.sin(tau * u * 0.5)), 22),
      stripe = marked && u > 0.17 && u < 0.62 && Math.sin(tau * (v * 2.4 + u * 1.7)) > 0.1;
    const tone = 1 + 0.015 * brushed + 0.06 * edge;
    return {
      color: (stripe ? [0.63 * tone, 0.46 * tone, 0.09 * tone] : [0.25 * tone, 0.315 * tone, 0.37 * tone]) as [
        number,
        number,
        number,
      ],
      height: 0.0025 * brushed,
      roughness: (stripe ? 0.55 : 0.39) + 0.025 * brushed,
      metalness: stripe ? 0.12 : 0.7,
      occlusion: 1,
    };
  };
  registerSurfaceSampler(steel, (u, v) => paint(u, v, false));
  registerSurfaceSampler(hazard, (u, v) => paint(u, v, true));
  registerSurfaceSampler(rubber, (u, v) => {
    const rib = Math.sin(tau * u * 12),
      grain = Math.sin(tau * v * 43) * Math.sin(tau * u * 35),
      t = 0.115 + 0.006 * grain;
    return {
      color: [t * 0.9, t, t * 0.99],
      height: 0.006 * rib + 0.002 * grain,
      roughness: 0.78 + 0.025 * grain,
      metalness: 0,
    };
  });
  registered = true;
}
const hazardNames = new Set([
  'segmented-armored-chest-shell',
  'runner-swept-chest-armor',
  'drone-top-faceted-shell-panel',
  'curved-fitted-shoulder-armor',
  'beveled-articulated-forearm-casing',
]);
export function applyLabFidelityMaterials(group: THREE.Group): void {
  register();
  const replacements = new Map<THREE.Material, THREE.Material>(),
    special = createSurfaceMaterial(hazard, { normalStrength: 0.2 });
  let usedSpecial = false;
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
    const old = o.material as THREE.MeshStandardMaterial,
      color = old.color.getHex();
    let role: SurfaceKey | undefined;
    if (color === 0x536674) role = steel;
    if (color === 0x9ca9aa || color === 0x202b32) role = 'brushedMetal';
    if (color === 0x303637) role = rubber;
    if (color === 0xd5dedb) role = 'ceramic';
    if (!role) return;
    if (hazardNames.has(o.name) && !o.geometry.getAttribute('uv')) authorFrontPanelCharts(o);
    else authorHardSurfaceCharts(o);
    if (hazardNames.has(o.name)) {
      o.material = special;
      usedSpecial = true;
      return;
    }
    let mat = replacements.get(old);
    if (!mat) {
      mat = createSurfaceMaterial(role, {
        normalStrength: role === rubber ? 0.32 : 0.18,
        color: role === 'brushedMetal' ? color : role === 'ceramic' ? 0xd5dedb : 0xffffff,
      });
      mat.side = old.side;
      replacements.set(old, mat);
    }
    o.material = mat;
  });
  if (!usedSpecial) special.dispose();
  // Original material might still be used by an unmarked component; dispose only unreferenced owners.
  const live = new Set<THREE.Material>();
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) live.add(m);
  });
  replacements.forEach((_, old) => {
    if (!live.has(old)) old.dispose();
  });
}
