import * as THREE from 'three';
import { createSurfaceMaterial, applySurfaceUV, registerSurfaceSampler, type SurfaceKey } from './SurfaceDetail';
import { castleSurfaceSample, type CastleSurfaceRole } from './castleSurfaceArt';
const roles: CastleSurfaceRole[] = [
  'velvet',
  'satin',
  'wornLeather',
  'agedGold',
  'spectralSkin',
  'brocade',
  'ivoryLinen',
  'hair',
];
for (const role of roles) registerSurfaceSampler(`${role}/castle`, (u, v) => castleSurfaceSample(role, u, v));
registerSurfaceSampler('wornLeather/castle-greave', (u, v) => {
  const s = castleSurfaceSample('wornLeather', u, v),
    d = Math.min(u, 1 - u),
    edge = Math.max(Math.exp(-(((d - 0.055) / 0.018) ** 2)), Math.exp(-(((v - 0.04) / 0.018) ** 2)));
  return {
    color: [0.06 + 0.43 * edge, 0.052 + 0.3 * edge, 0.06 + 0.13 * edge],
    height: s.height * 0.4 + 0.02 * edge,
    roughness: 0.58 - 0.25 * edge,
    metalness: 0.8 * edge,
    occlusion: 1,
  };
});
/** Actual renderer materials, exported unchanged into the review GLB. */
export function dressDracula(group: THREE.Group): void {
  const materials = {
    coat: createSurfaceMaterial('velvet/castle', {
      color: 0x0f1119,
      normalStrength: 0.22,
      sheen: 0.1,
      sheenColor: 0x302a36,
      sheenRoughness: 0.8,
    }),
    lining: createSurfaceMaterial('satin/castle', {
      color: 0x510f21,
      normalStrength: 0.12,
      sheen: 0.18,
      sheenColor: 0x79293d,
      sheenRoughness: 0.45,
    }),
    lapel: createSurfaceMaterial('brocade/castle', {
      color: 0xffffff,
      normalStrength: 0.45,
      embroideryStrength: 0.8,
      sheen: 0.12,
      sheenColor: 0x3b303d,
    }),
    waist: createSurfaceMaterial('brocade/castle', {
      color: 0xaaa1a2,
      normalStrength: 0.4,
      sheen: 0.1,
      sheenColor: 0x3b303d,
    }),
    greave: createSurfaceMaterial('wornLeather/castle-greave', { color: 0xffffff, normalStrength: 0.4, sheen: 0 }),
    leather: createSurfaceMaterial('wornLeather/castle', { color: 0x1c1920, normalStrength: 0.3, sheen: 0 }),
    gold: createSurfaceMaterial('agedGold/castle', { color: 0xa68b55, normalStrength: 0.15, sheen: 0 }),
    linen: createSurfaceMaterial('ivoryLinen/castle', {
      color: 0xc7beab,
      normalStrength: 0.2,
      sheen: 0.12,
      sheenColor: 0xd9d0bd,
    }),
    skin: createSurfaceMaterial('spectralSkin/castle', {
      color: 0xa2948d,
      normalStrength: 0.08,
      roughness: 1,
      sheen: 0,
    }),
    hair: createSurfaceMaterial('hair/castle', { color: 0x17151e, normalStrength: 0.25, sheen: 0 }),
    socket: new THREE.MeshStandardMaterial({ color: 0x08060c, roughness: 0.72 }),
    iris: new THREE.MeshStandardMaterial({
      color: 0x4c1722,
      roughness: 0.24,
      emissive: 0x5f071b,
      emissiveIntensity: 0,
    }),
    mouth: new THREE.MeshStandardMaterial({ color: 0x704951, roughness: 0.6 }),
    sclera: new THREE.MeshStandardMaterial({ color: 0x94877e, roughness: 0.63 }),
    fang: new THREE.MeshStandardMaterial({ color: 0xc7c0b7, roughness: 0.35 }),
    gem: new THREE.MeshPhysicalMaterial({ color: 0x6b0f24, roughness: 0.22, metalness: 0.1, clearcoat: 0.3 }),
    magic: new THREE.MeshStandardMaterial({
      color: 0x58081e,
      roughness: 0.6,
      metalness: 0.08,
      emissive: 0x98132e,
      emissiveIntensity: 0.8,
    }),
  };
  materials.skin.vertexColors = true;
  materials.hair.specularIntensity = 0.4;
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
    const name = o.name,
      old = o.material as THREE.MeshStandardMaterial;
    let mat: THREE.MeshStandardMaterial = materials.coat;
    let uvU = 2,
      uvV = 3;
    if (/cape-lining|crimson-collar/.test(name)) {
      mat = materials.lining;
      uvU = 4;
      uvV = 5;
    } else if (/notched-jacket-lapel/.test(name)) {
      mat = materials.lapel;
      uvU = 1.2;
      uvV = 3;
    } else if (name === 'waistcoat') {
      mat = materials.waist;
      uvU = 2;
      uvV = 4;
    } else if (/greave-panel/.test(name)) {
      mat = materials.greave;
      uvU = uvV = 1;
    } else if (/leather-boot/.test(name)) {
      mat = materials.leather;
      uvU = 2;
      uvV = 2;
    } else if (/welt|trim|boot.*seam/.test(name) || old.color.getHex() === 0xa68a58) {
      mat = materials.gold;
      uvU = 1;
      uvV = 3;
    } else if (/jabot|cravat|ivory-cuff|ivory-collar/.test(name)) {
      mat = materials.linen;
      uvU = 2;
      uvV = 3;
    } else if (/vampire-face|vampire-ear|connected-neck|palm|finger|thumb|sculpted-.*lid/.test(name))
      mat = materials.skin;
    else if (/hair|natural-brow/.test(name)) {
      mat = materials.hair;
      uvU = 1;
      uvV = 1;
    } else if (/eye-socket|pupil/.test(name)) mat = materials.socket;
    else if (/ruby-eye/.test(name)) mat = materials.iris;
    else if (/mouth|nostril/.test(name)) mat = materials.mouth;
    else if (/almond-sclera/.test(name)) mat = materials.sclera;
    else if (/fang/.test(name)) mat = materials.fang;
    else if (/magic-core|crimson-wisp/.test(name) || old.emissiveIntensity > 0.1) mat = materials.magic;
    else if (old.color.getHex() === 0xa41f3c) mat = materials.gem;
    if (old.side === THREE.DoubleSide) mat.side = THREE.DoubleSide;
    o.material = mat;
    const preset = mat.userData.surfacePreset as SurfaceKey | undefined;
    if (preset) {
      if (!o.geometry.getAttribute('uv')) throw new Error(`Missing tailored UV: ${name}`);
      applySurfaceUV(o.geometry, preset, uvU, uvV);
    }
    if (mat === materials.skin && !o.geometry.getAttribute('color')) {
      const p = o.geometry.getAttribute('position'),
        colors: number[] = [];
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i) - 0.035,
          y = p.getY(i);
        const cool = /vampire-face/.test(name)
          ? Math.exp(-(((Math.abs(x) - 0.12) / 0.055) ** 2) - ((y - 2.87) / 0.1) ** 2)
          : 0;
        const lip = /vampire-face/.test(name) ? Math.exp(-((x / 0.07) ** 2) - ((y - 2.76) / 0.035) ** 2) : 0;
        const orbital = /vampire-face/.test(name)
          ? Math.exp(-(((Math.abs(x) - 0.085) / 0.052) ** 2) - ((y - 2.946) / 0.041) ** 2)
          : 0;
        const temple = /vampire-face/.test(name)
          ? Math.exp(-(((Math.abs(x) - 0.145) / 0.035) ** 2) - ((y - 2.99) / 0.09) ** 2)
          : 0;
        const lid = /sculpted-upper-lid/.test(name) ? 0.23 : /sculpted-lower-lid/.test(name) ? 0.1 : 0;
        colors.push(
          0.97 - 0.25 * orbital - 0.09 * temple - 0.07 * cool - lid,
          0.94 - 0.29 * orbital - 0.1 * temple - 0.085 * cool - 0.035 * lip - lid,
          0.94 - 0.23 * orbital - 0.07 * temple - 0.035 * cool - 0.018 * lip - lid,
        );
      }
      o.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    }
  });
}
