import * as THREE from 'three';
import { createSurfaceMaterial, registerSurfaceSampler, type SurfaceKey, type SurfaceSample } from './SurfaceDetail';
const tau = Math.PI * 2;
const line = (x: number, w: number) => Math.exp(-((x / w) ** 2));
const clamp = (x: number) => Math.max(0, Math.min(1, x));
/** Periodic original organic cells; distance gap makes intentional pigment boundaries. */
function cell(u: number, v: number, nx: number, ny: number): { edge: number; center: number } {
  const x = u * nx,
    y = v * ny;
  let a = 99,
    b = 99;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const ix = Math.floor(x) + i,
        iy = Math.floor(y) + j;
      const px = ix + 0.5 + 0.19 * Math.sin((((ix % nx) + nx) % nx) * 2.7 + (((iy % ny) + ny) % ny) * 1.8),
        py = iy + 0.5 + 0.17 * Math.sin((((ix % nx) + nx) % nx) * 1.3 - (((iy % ny) + ny) % ny) * 2.1);
      const d = Math.hypot(x - px, y - py);
      if (d < a) {
        b = a;
        a = d;
      } else if (d < b) b = d;
    }
  return { edge: line(b - a, 0.075), center: a };
}
function sample(role: string, u: number, v: number): SurfaceSample {
  const fine = Math.sin(tau * u * 43) * Math.sin(tau * v * 39),
    c = cell(u, v, 9, 7);
  if (role === 'shark')
    return {
      color: [0.07 + 0.035 * c.edge, 0.16 + 0.12 * c.edge, 0.29 + 0.2 * c.edge],
      height: 0.002 * fine + 0.006 * c.edge,
      roughness: 0.39 + 0.08 * (1 - c.edge),
      metalness: 0,
      occlusion: 1,
    };
  if (role === 'puffer') {
    const pore = line(c.center - 0.1, 0.035),
      rim = line(c.center - 0.36, 0.025);
    return {
      color: [0.66 + 0.13 * rim - 0.2 * pore, 0.25 + 0.1 * rim - 0.11 * pore, 0.035 + 0.035 * rim],
      height: 0.007 * rim - 0.009 * pore,
      roughness: 0.5 + 0.09 * pore,
      metalness: 0,
      occlusion: 1,
    };
  }
  if (role === 'pale')
    return {
      color: [0.8 + 0.06 * fine, 0.72 + 0.04 * fine, 0.51 + 0.025 * fine],
      height: 0.002 * fine,
      roughness: 0.52 + 0.08 * c.edge,
      metalness: 0,
      occlusion: 1,
    };
  if (role === 'fin') {
    const ray = Math.pow(Math.max(0, Math.cos(tau * (Math.atan2(v - 0.04, u - 0.5) * 2.5))), 20);
    return {
      color: [0.65 + 0.27 * ray, 0.68 + 0.25 * ray, 0.74 + 0.23 * ray],
      height: 0.018 * ray,
      roughness: 0.46 - 0.13 * ray,
      metalness: 0,
      occlusion: 1,
    };
  }
  if (role === 'jelly') {
    const sector = Math.floor(u * 6),
      f = u * 6 - sector,
      path = 0.5 + 0.12 * Math.sin(v * 7 + sector * 1.7);
    const main = line(f - path, 0.025),
      branchPhase = (v * 3 + sector * 0.21) % 1;
    const branch = line(Math.abs(f - path) - branchPhase * 0.32, 0.018) * Math.pow(Math.sin(Math.PI * branchPhase), 2);
    const veins = clamp(main * 0.55 + branch * 0.35) * (0.35 + 0.65 * Math.sin(Math.PI * v));
    return {
      color: [0.18 + 0.16 * veins, 0.055 + 0.2 * veins, 0.3 + 0.23 * veins],
      height: 0.008 * veins,
      roughness: 0.33 + 0.08 * (1 - veins),
      metalness: 0,
      occlusion: 1,
    };
  }
  if (role === 'tide') {
    const fold = 0.5 + 0.5 * Math.cos(tau * (u * 7 + 0.25 * Math.sin(tau * v))),
      hem = line(v - 0.055, 0.012),
      weave = Math.sin(tau * u * 37) * Math.sin(tau * v * 41);
    return {
      color: [0.035 + 0.025 * fold + 0.04 * hem, 0.15 + 0.065 * fold + 0.1 * hem, 0.2 + 0.085 * fold + 0.12 * hem],
      height: 0.006 * fold + 0.002 * weave + 0.009 * hem,
      roughness: 0.62 - 0.1 * fold - 0.09 * hem,
      metalness: 0.08 * hem,
      occlusion: 1,
    };
  }
  if (role === 'edgeCloth') {
    const rim = clamp(line(v - 0.97, 0.035) + line(u, 0.025) + line(u - 1, 0.025));
    const ray = Math.pow(Math.max(0, Math.cos(tau * (u * 5 + 0.08 * Math.sin(v * 5)))), 14) * v;
    return {
      color: [0.13 + 0.24 * rim + 0.035 * ray, 0.34 + 0.22 * rim + 0.07 * ray, 0.42 + 0.22 * rim + 0.08 * ray],
      height: 0.013 * rim + 0.006 * ray,
      roughness: 0.58 - 0.16 * rim,
      metalness: 0.12 * rim,
      occlusion: 1,
    };
  }
  if (role === 'bodice') {
    const seam = clamp(line(u - (0.22 + 0.09 * v), 0.02) + line(u - (0.78 - 0.09 * v), 0.02));
    const motif = line(Math.abs(u - 0.5) - 0.12 * Math.sin(Math.PI * v), 0.012) * Math.pow(Math.sin(Math.PI * v), 2);
    return {
      color: [0.04 + 0.09 * seam + 0.04 * motif, 0.12 + 0.2 * seam + 0.09 * motif, 0.17 + 0.23 * seam + 0.12 * motif],
      height: 0.009 * seam + 0.005 * motif,
      roughness: 0.62 - 0.12 * seam,
      metalness: 0.05 * seam,
      occlusion: 1,
    };
  }
  if (role === 'hair') {
    const strand = Math.sin(tau * (u * 21 + 0.18 * Math.sin(tau * v)));
    return {
      color: [0.055 + 0.01 * strand, 0.11 + 0.018 * strand, 0.15 + 0.025 * strand],
      height: 0.008 * strand,
      roughness: 0.68 + 0.04 * fine,
      metalness: 0,
      occlusion: 1,
    };
  }
  if (role === 'skin')
    return {
      color: [0.53 + 0.015 * fine, 0.7 + 0.012 * fine, 0.67 + 0.012 * fine],
      height: 0.0008 * fine,
      roughness: 0.56,
      metalness: 0,
      occlusion: 1,
    };
  return {
    color: [0.49 + 0.06 * c.edge, 0.15 + 0.035 * c.edge, 0.105 + 0.025 * c.edge],
    height: 0.007 * c.edge - 0.003 * fine,
    roughness: 0.7,
    metalness: 0,
    occlusion: 1,
  };
}
const keys: Record<string, SurfaceKey> = {
  shark: 'scales/sea-shark-dorsal',
  puffer: 'scales/sea-puffer-armor',
  pale: 'bone/sea-pale',
  fin: 'wetSkin/sea-fin-ray',
  jelly: 'wetSkin/sea-jelly-vein',
  tide: 'satin/sea-tidal-cloth',
  hair: 'hair/sea-flowing',
  edgeCloth: 'satin/sea-fin-edging',
  bodice: 'satin/sea-tailored-bodice',
  skin: 'spectralSkin/sea-witch',
  coral: 'ceramic/sea-coral',
};
for (const [role, key] of Object.entries(keys)) registerSurfaceSampler(key, (u, v) => sample(role, u, v));
export function dressSeaCreature(group: THREE.Group): THREE.Group {
  const id = group.name,
    cache = new Map<string, THREE.MeshPhysicalMaterial>(),
    replaced = new Set<THREE.Material>();
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
    const old = o.material as THREE.MeshStandardMaterial;
    if (!old.color) return;
    const color = old.color.getHex(),
      name = o.name;
    let role: string | undefined,
      tint = 0xffffff;
    if (id === 'v2-sharkFin') {
      if (color === 0x315a78) role = 'shark';
      else if ([0x284b68, 0x355e77, 0x406c84, 0x476b7b].includes(color)) {
        role = 'fin';
        tint = 0x315a78;
      } else if (color === 0xcbd9d6) {
        role = 'pale';
        tint = 0xd4e7eb;
      }
    } else if (id === 'v2-pufferfish') {
      if (color === 0xc97926) role = 'puffer';
      else if ([0xdac597, 0xe7d4aa, 0xdcc697].includes(color)) role = 'pale';
      else if ([0x9c531f, 0xa75b25].includes(color)) {
        role = 'fin';
        tint = 0xb87532;
      }
    } else if (id === 'v2-jellyfish') {
      if (name === 'jelly-bell') role = 'jelly';
      else if (name === 'flowing-jelly-tentacle') {
        role = 'fin';
        tint = 0x9a65b6;
      }
    } else if (id === 'v2-seaWitch') {
      if ([0x2a6478, 0x417e8a, 0x92bbc2].includes(color)) {
        role = 'edgeCloth';
        tint = color === 0x92bbc2 ? 0xc9e5e8 : color === 0x417e8a ? 0xb2d4dc : 0x8bb7c5;
      } else if (color === 0x123644) role = 'bodice';
      else if ([0x234b5d, 0x376f7b, 0x2d5d70, 0x386e7b].includes(color)) role = 'tide';
      else if (color === 0x1c3c4d) role = 'hair';
      else if (color === 0x94bdb8) role = 'skin';
      else if ([0xac6350, 0x9d5543].includes(color)) role = 'coral';
      else if ([0xe0d7ba, 0xe7e3cd].includes(color)) role = 'pale';
    }
    if (!role) return;
    const key = role + ':' + tint;
    let material = cache.get(key);
    if (!material) {
      material = createSurfaceMaterial(keys[role], {
        color: tint,
        normalStrength: role === 'skin' ? 0.1 : 0.24,
        sheen: role === 'tide' ? 0.24 : 0,
        sheenColor: 0x75afb3,
        sheenRoughness: 0.46,
      });
      material.name = 'sea-authored-' + role + '-' + tint;
      if (role === 'jelly') {
        material.transparent = true;
        material.opacity = 0.55;
        material.depthWrite = false;
        material.side = THREE.FrontSide;
        material.clearcoat = 0.15;
        material.clearcoatRoughness = 0.35;
        material.emissive.set(0x47235f);
        material.emissiveMap = material.map;
        material.emissiveIntensity = 0.1;
      }
      cache.set(key, material);
    }
    if (role === 'skin') {
      if (!o.geometry.hasAttribute('color'))
        o.geometry.setAttribute(
          'color',
          new THREE.Float32BufferAttribute(new Float32Array(o.geometry.getAttribute('position').count * 3).fill(1), 3),
        );
      material.vertexColors = true;
    }
    o.material = material;
    replaced.add(old);
  });
  group.traverse((o) => {
    if (o instanceof THREE.Mesh)
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) replaced.delete(m);
  });
  for (const m of replaced) m.dispose();
  return group;
}
