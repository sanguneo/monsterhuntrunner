import './castleMaterials';
import * as THREE from 'three';
import { createSurfaceMaterial, applySurfaceUV, registerSurfaceSampler, type SurfaceKey } from './SurfaceDetail';
const tau = Math.PI * 2;
registerSurfaceSampler('hair/castle-beast-fur', (u, v) => {
  // Swept, staggered locks with fine directional strands, not isotropic noise.
  const bend = u + 0.027 * Math.sin(tau * v * 2);
  const strand = Math.pow(0.5 + 0.5 * Math.cos(tau * (bend * 29 + v * 0.8)), 7);
  const lock = (0.5 + 0.5 * Math.cos(tau * (bend * 6 - v * 0.4))) * (0.65 + 0.35 * Math.sin(tau * v * 3) ** 2);
  const shade = 0.88 + 0.035 * lock + 0.025 * strand;
  return {
    color: [shade, shade * 0.985, shade * 0.98],
    height: 0.001 * lock + 0.0006 * strand,
    roughness: 0.82 + 0.12 * (1 - strand),
    metalness: 0,
    occlusion: 0.94 + 0.06 * lock,
  };
});
registerSurfaceSampler('ivoryLinen/castle-ragged-sash', (u, v) => {
  const warp = Math.sin(tau * u * 36),
    weft = Math.sin(tau * v * 35);
  const crease = 0.5 + 0.5 * Math.sin(tau * (u * 3 + v * 0.2));
  const weave = warp * weft;
  const shade = 0.77 + 0.16 * crease + 0.025 * weave;
  return {
    color: [shade, shade * 0.97, shade * 0.95],
    height: 0.008 * weave + 0.014 * crease,
    roughness: 0.89 + 0.06 * crease,
    metalness: 0,
    occlusion: 0.97,
  };
});
/** Creature-specific fur / leather / ragged cloth hierarchy. Shared immutable maps. */
export function dressCastleBeast(group: THREE.Group): void {
  const membrane =
    group.name === 'bat'
      ? createSurfaceMaterial('wetSkin/castle-bat-membrane', { color: 0xffffff, normalStrength: 0.28, sheen: 0 })
      : null;
  const fur = createSurfaceMaterial('hair/castle-beast-fur', {
    color: 0xb4b0b0,
    normalStrength: 0.12,
    sheen: 0.08,
    sheenColor: 0x5c5557,
    sheenRoughness: 0.9,
  });
  fur.vertexColors = true;
  const leather = createSurfaceMaterial('wornLeather/castle', { color: 0x49352e, normalStrength: 0.35, sheen: 0 });
  const sash = createSurfaceMaterial('ivoryLinen/castle-ragged-sash', {
    color: 0x651b2b,
    normalStrength: 0.4,
    sheen: 0,
  });
  const metal = createSurfaceMaterial('agedGold/castle', { color: 0xa08c69, normalStrength: 0.2, sheen: 0 });
  const bone = createSurfaceMaterial('bone', { color: 0xbcb09a, normalStrength: 0.15, sheen: 0 });
  const nose = createSurfaceMaterial('wornLeather/castle', {
    color: 0x17131b,
    normalStrength: 0.2,
    sheen: 0,
    roughness: 0.6,
  });
  const mouth = new THREE.MeshStandardMaterial({ color: 0x17121a, roughness: 0.82 });
  const eye = new THREE.MeshStandardMaterial({
    color: 0xd29734,
    emissive: 0x4d2607,
    emissiveIntensity: 0.17,
    roughness: 0.3,
  });
  group.traverse((ob) => {
    if (!(ob instanceof THREE.Mesh) || Array.isArray(ob.material)) return;
    const old = ob.material as THREE.MeshStandardMaterial,
      n = ob.name;
    let mat: THREE.MeshStandardMaterial = fur;
    if (/membrane/.test(n) && membrane) mat = membrane;
    else if (/amber.*eye|alert-eye/.test(n)) mat = eye;
    else if (/mouth|jaw-interior|pupil|brow-socket|eye-socket/.test(n)) mat = mouth;
    else if (/fang|claw/.test(n) && !/hand-palm|opposed-claw-thumb/.test(n)) mat = bone;
    else if (/sash/.test(n)) mat = sash;
    else if (/harness|wrist-wrap/.test(n)) mat = leather;
    else if (/nose/.test(n)) mat = nose;
    else if (/buckle/.test(n) || old.metalness > 0.3) mat = metal;
    if (mat === fur && !old.vertexColors) {
      const p = ob.geometry.getAttribute('position'),
        a: number[] = [];
      for (let i = 0; i < p.count; i++) a.push(old.color.r, old.color.g, old.color.b);
      ob.geometry.setAttribute('color', new THREE.Float32BufferAttribute(a, 3));
    }
    ob.material = mat;
    if (old.side === THREE.DoubleSide) mat.side = THREE.DoubleSide;
    const preset = mat.userData.surfacePreset as SurfaceKey | undefined;
    if (preset) {
      if (!ob.geometry.getAttribute('uv')) throw new Error(`Missing castle beast UV ${n}`);
      applySurfaceUV(ob.geometry, preset, mat === fur ? 2 : 1, mat === fur ? 3 : mat === membrane ? 1 : 2);
    }
  });
}

registerSurfaceSampler('wetSkin/castle-bat-membrane', (u, v) => {
  const main = Math.exp(-((Math.sin(Math.PI * u * 5) / 0.065) ** 2)) * Math.sqrt(Math.max(0, v));
  const fork = Math.exp(-((Math.sin(Math.PI * (u * 17 + 0.22 * Math.sin(v * 9))) / 0.075) ** 2)) * v * (1 - v);
  const tint = 0.025 * Math.sin(u * 19 + v * 7);
  return {
    color: [0.34 + tint - 0.07 * main, 0.105 + tint * 0.3 - 0.035 * main, 0.155 + tint * 0.5 - 0.035 * main],
    height: 0.018 * main + 0.004 * fork,
    roughness: 0.73 - 0.07 * main,
    metalness: 0,
    occlusion: 0.97,
  };
});
registerSurfaceSampler('wornLeather/castle-ghoul-dry', (u, v) => ({
  color: [0.91, 0.9, 0.91],
  height: 0.0015 * Math.sin(tau * u * 17) * Math.sin(tau * v * 19),
  roughness: 0.94,
  metalness: 0,
  occlusion: 1,
}));
registerSurfaceSampler('ivoryLinen/castle-shroud', (u, v) => {
  const weave = Math.sin(tau * u * 12) * Math.sin(tau * v * 11);
  const wear = 0.5 + 0.5 * Math.sin(tau * (u * 3 + v)) * Math.sin(tau * (v * 2 - u));
  return {
    color: [0.34 + 0.07 * wear, 0.31 + 0.065 * wear, 0.295 + 0.055 * wear],
    height: 0.0015 * weave + 0.003 * wear,
    roughness: 0.94,
    metalness: 0,
    occlusion: 0.97,
  };
});
/** Ash-woven heavy shroud and dry dark hands, not the vampire's satin or beast's fur. */
export function dressGhoulCloth(group: THREE.Group): void {
  const cloth = createSurfaceMaterial('ivoryLinen/castle-shroud', {
    color: 0xffffff,
    normalStrength: 0.12,
    sheen: 0.06,
    sheenColor: 0x5f5650,
    sheenRoughness: 0.95,
  });
  const skin = createSurfaceMaterial('wornLeather/castle-ghoul-dry', {
    color: 0x27242a,
    normalStrength: 0.18,
    sheen: 0,
    roughness: 1,
  });
  const face = new THREE.MeshStandardMaterial({ color: 0x151219, roughness: 0.96 });
  const mouth = new THREE.MeshStandardMaterial({ color: 0x08070a, roughness: 1 });
  const eye = new THREE.MeshStandardMaterial({
    color: 0xd59b34,
    emissive: 0x8d420b,
    emissiveIntensity: 0.45,
    roughness: 0.5,
  });
  const bone = createSurfaceMaterial('bone', { color: 0xb2a58c, normalStrength: 0.13, sheen: 0 });
  group.traverse((ob) => {
    if (!(ob instanceof THREE.Mesh) || Array.isArray(ob.material)) return;
    const n = ob.name;
    let mat: THREE.MeshStandardMaterial = cloth;
    if (/eye/.test(n)) mat = eye;
    else if (/mouth/.test(n)) mat = mouth;
    else if (/^recessed-ghoul-face$/.test(n)) mat = face;
    else if (/fang/.test(n)) mat = bone;
    else if (/arm|palm|finger|thumb|lower-jaw/.test(n)) mat = skin;
    ob.geometry.deleteAttribute('color');
    ob.material = mat;
    const preset = mat.userData.surfacePreset as SurfaceKey | undefined;
    if (preset) {
      if (!ob.geometry.getAttribute('uv')) throw new Error(`Ghoul UV missing ${n}`);
      applySurfaceUV(ob.geometry, preset, 2, 3);
    }
  });
}
