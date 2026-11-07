import * as THREE from 'three';
import { createSurfaceMaterial, registerSurfaceSampler, type SurfaceKey } from './SurfaceDetail';
const tau = Math.PI * 2;
const clamp = (v: number) => THREE.MathUtils.clamp(v, 0, 1);
const field = (u: number, v: number) =>
  Math.sin(tau * (u * 31 + Math.sin(v * tau * 7) * 0.12)) * Math.sin(tau * v * 43);
const leather: SurfaceKey = 'wornLeather/lab-heavy-coat';
const boot: SurfaceKey = 'wornLeather/lab-boot';
const hair: SurfaceKey = 'hair/lab-cropped-locks';
const lining: SurfaceKey = 'satin/lab-blue-lining';
let registered = false;
function registerArtwork(): void {
  if (registered) return;
  registerSurfaceSampler(leather, (u, v) => {
    // Panel-space stitching and compressed seam channels, not random global grime.
    const edge = Math.min(u, 1 - u),
      seam = Math.exp(-Math.pow((edge - 0.035) / 0.012, 2));
    const stitch = Math.exp(-Math.pow((edge - 0.055) / 0.009, 2)) * Math.pow(Math.max(0, Math.cos(tau * v * 28)), 8);
    const crease =
      Math.pow(Math.max(0, Math.cos(tau * (u * 3 + 0.1 * Math.sin(tau * v * 2)))), 18) *
      (0.35 + 0.65 * Math.sin(Math.PI * v) ** 2);
    const grain = field(u, v),
      tone = 0.12 + grain * 0.007 - crease * 0.012 + seam * 0.016 + stitch * 0.055;
    return {
      color: [tone * 0.95, tone, tone * 0.98],
      height: grain * 0.006 - crease * 0.018 - seam * 0.014 + stitch * 0.02,
      roughness: clamp(0.57 + grain * 0.035 - seam * 0.1),
      metalness: 0,
      occlusion: 1 - seam * 0.13,
    };
  });
  registerSurfaceSampler(boot, (u, v) => {
    const fold =
      Math.pow(Math.max(0, Math.cos(tau * (v * 9 + 0.11 * Math.sin(tau * u * 3)))), 12) *
      Math.exp(-Math.pow((v - 0.6) / 0.24, 2));
    const g = field(u, v),
      t = 0.105 + 0.006 * g - 0.014 * fold;
    return {
      color: [t, t * 1.03, t],
      height: 0.005 * g - 0.019 * fold,
      roughness: 0.48 + 0.035 * g,
      metalness: 0,
      occlusion: 1 - 0.1 * fold,
    };
  });
  registerSurfaceSampler(lining, (u, v) => {
    const weave = Math.sin(tau * u * 52) * Math.sin(tau * v * 48),
      t = 1 + 0.025 * weave;
    return {
      color: [0.12 * t, 0.255 * t, 0.33 * t],
      height: 0.003 * weave,
      roughness: 0.46 + 0.025 * weave,
      metalness: 0,
    };
  });
  registerSurfaceSampler(hair, (u, v) => {
    const strands = Math.sin(tau * (u * 43 + 0.1 * Math.sin(tau * v * 3))),
      tone = 0.082 + 0.006 * strands;
    return {
      color: [tone * 0.9, tone, tone * 0.94],
      height: 0.003 * strands,
      roughness: 0.72 + 0.035 * strands,
      metalness: 0,
    };
  });
  registered = true;
}
/** Explicit authored UV surfaces only. SDF skin receives its separate SHA-locked offline atlas. */
export function applyFrankensteinGarmentMaterials(group: THREE.Group): void {
  registerArtwork();
  const coatMat = createSurfaceMaterial(leather, { normalStrength: 0.35 });
  const bootMat = createSurfaceMaterial(boot, { normalStrength: 0.3 });
  const liningMat = createSurfaceMaterial(lining, { normalStrength: 0.2, sheen: 0.22, sheenColor: 0x416d86 });
  const hairMat = createSurfaceMaterial(hair, { normalStrength: 0.22 });
  const replacements = new Set<THREE.Material>();
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    let material: THREE.Material | undefined;
    if (o.name.includes('heavy-leather') || o.name === 'folded-leather-lapel') material = coatMat;
    if (o.name === 'shaped-black-leather-boot') material = bootMat;
    if (o.name.includes('blue-inner-lining')) material = liningMat;
    if (o.name === 'short-directional-cropped-hair' || o.name === 'sculpted-cropped-hair-lock') material = hairMat;
    if (!material) return;
    if (o.name === 'folded-leather-lapel') {
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      const p = g.getAttribute('position'),
        uv = new Float32Array(p.count * 2);
      for (let i = 0; i < p.count; i += 3) {
        const a = new THREE.Vector3().fromBufferAttribute(p, i),
          b = new THREE.Vector3().fromBufferAttribute(p, i + 1),
          c = new THREE.Vector3().fromBufferAttribute(p, i + 2);
        const n = b.clone().sub(a).cross(c.clone().sub(a));
        const omit =
          Math.abs(n.x) > Math.abs(n.y) && Math.abs(n.x) > Math.abs(n.z) ? 0 : Math.abs(n.y) > Math.abs(n.z) ? 1 : 2;
        const axes = [0, 1, 2].filter((k) => k !== omit);
        for (let j = 0; j < 3; j++) {
          const q = new THREE.Vector3().fromBufferAttribute(p, i + j);
          uv[(i + j) * 2] = q.getComponent(axes[0]) * 2;
          uv[(i + j) * 2 + 1] = q.getComponent(axes[1]) * 2;
        }
      }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      o.geometry.dispose();
      o.geometry = g;
    }
    if (!o.geometry.getAttribute('uv')) throw new Error(`${o.name}: garment UV missing`);
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) replacements.add(m);
    o.material = material;
  });
  // Dispose only replaced materials that are no longer referenced by another part.
  group.traverse((o) => {
    if (o instanceof THREE.Mesh)
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) replacements.delete(m);
  });
  replacements.forEach((m) => m.dispose());
}
