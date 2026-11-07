import * as THREE from 'three';
import { createSurfaceMaterial, registerSurfaceSampler, type SurfaceKey } from './SurfaceDetail';
import { authorHardSurfaceCharts } from './zombieLabCharts';
const tau = Math.PI * 2;
const leather: SurfaceKey = 'wornLeather/zombie-patched-leather',
  mantle: SurfaceKey = 'velvet/zombie-royal-mantle',
  stone: SurfaceKey = 'bone/zombie-gravestone',
  hair: SurfaceKey = 'hair/zombie-cropped';
let registered = false;
function register(): void {
  if (registered) return;
  registerSurfaceSampler(leather, (u, v) => {
    const grain = Math.sin(tau * u * 37) * Math.sin(tau * (v * 41 + 0.12 * Math.sin(tau * u * 7))),
      fold = Math.pow(Math.max(0, Math.cos(tau * (u * 4 + 0.16 * Math.sin(tau * v * 2)))), 20);
    const seam = Math.exp(-Math.pow((Math.abs(Math.sin(tau * u * 2)) - 0.12) / 0.045, 2)),
      stitch = seam * Math.pow(Math.max(0, Math.cos(tau * v * 27)), 8),
      tone = 1 + 0.035 * grain - 0.09 * fold + 0.13 * stitch;
    return {
      color: [0.27 * tone, 0.17 * tone, 0.105 * tone],
      height: 0.006 * grain - 0.014 * fold + 0.012 * stitch,
      roughness: 0.66 + 0.045 * grain,
      metalness: 0,
      occlusion: 1 - 0.1 * fold,
    };
  });
  registerSurfaceSampler(mantle, (u, v) => {
    const weave = Math.sin(tau * u * 48) * Math.sin(tau * v * 48),
      tone = 1 + 0.024 * weave;
    return { color: [0.1 * tone, 0.205 * tone, 0.155 * tone], height: 0.003 * weave, roughness: 0.82, metalness: 0 };
  });
  registerSurfaceSampler(stone, (u, v) => {
    const grain = Math.sin(tau * u * 23) * Math.sin(tau * v * 31),
      crack = Math.exp(-Math.pow((v - 0.35 - 0.16 * Math.sin(u * 8)) / 0.007, 2)),
      tone = 0.43 + 0.035 * grain - 0.15 * crack;
    return {
      color: [tone, tone * 1.02, tone * 0.96],
      height: 0.012 * grain - 0.024 * crack,
      roughness: 0.91,
      metalness: 0,
      occlusion: 1 - 0.25 * crack,
    };
  });
  registerSurfaceSampler(hair, (u, v) => {
    const line = Math.sin(tau * (u * 18 + v * 0.8 + 0.12 * Math.sin(v * tau * 2))),
      fine = Math.sin(tau * (u * 43 + v * 1.7)),
      t = 0.085 + 0.014 * line + 0.003 * fine;
    return { color: [t, t * 1.04, t * 0.9], height: 0.012 * line + 0.002 * fine, roughness: 0.69, metalness: 0 };
  });
  registered = true;
}
/** Preserve authored material batching: replace by original material identity, not per decoration. */
export function applyZombieFidelityMaterials(group: THREE.Group): void {
  register();
  const replacements = new Map<THREE.Material, THREE.MeshStandardMaterial>();
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
    const old = o.material as THREE.MeshStandardMaterial,
      color = old.color.getHex();
    let role: SurfaceKey | undefined;
    if (color === 0x4c3528 && old.roughness < 0.6) role = leather;
    if (color === 0x284a3d || color === 0x232b25) role = mantle;
    if (color === 0x30261c || (color === 0x876343 && old.roughness > 0.7)) role = leather;
    if (color === 0x777a71) role = stone;
    if (color === 0x30342b) role = hair;
    if (color === 0xa68742 && old.metalness > 0.5) role = 'agedGold';
    if (!role) return;
    authorHardSurfaceCharts(o);
    if (role === leather) {
      if (!o.geometry.getAttribute('color'))
        o.geometry.setAttribute(
          'color',
          new THREE.Float32BufferAttribute(new Float32Array(o.geometry.attributes.position.count * 3).fill(1), 3),
        );
      old.vertexColors = true;
    }
    let mat = replacements.get(old);
    if (!mat) {
      mat = createSurfaceMaterial(role, {
        normalStrength: role === stone ? 0.4 : role === hair ? 0.55 : 0.28,
        color:
          color === 0x232b25 ? 0x777770 : color === 0x30261c ? 0x8b8172 : role === 'agedGold' ? 0xa68742 : 0xffffff,
        sheen: role === mantle ? 0.25 : undefined,
        sheenColor: role === mantle ? 0x284a3d : undefined,
        sheenRoughness: role === mantle ? 0.85 : undefined,
      });
      if (color === 0x876343) {
        mat.map = null;
        mat.color.setHex(0x876343);
      }
      mat.side = old.side;
      mat.vertexColors = old.vertexColors;
      replacements.set(old, mat);
    }
    o.material = mat;
  });
  replacements.forEach((_, old) => old.dispose());
}
