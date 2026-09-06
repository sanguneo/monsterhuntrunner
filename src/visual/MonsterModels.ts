import * as THREE from 'three';
import type { MonsterDef } from '../data/worlds';
import { ModelKit, bakeStaticModel, type Vec3 } from './ModelKit';

// Front is -Z. Templates are level-lifetime assets: spawns clone only transforms.
const templates = new Map<string, THREE.Group>();
const ink = 0x332c46;
const cream = 0xffedce;
const pink = 0xf49ba9;
const bone = 0xe9ddbf;

function orb(k: ModelKit, color: number, p: Vec3, s: Vec3): THREE.Mesh {
  return k.sphere(color, p, s, k.group, 8);
}

function face(k: ModelKit, y: number, z: number, spread = 0.15, scale = 1): void {
  for (const side of [-1, 1]) {
    orb(k, ink, [side * spread, y, z], [0.065 * scale, 0.087 * scale, 0.038]);
    orb(k, cream, [side * spread - 0.018 * scale, y + 0.026 * scale, z - 0.033], [0.018 * scale, 0.023 * scale, 0.013]);
    orb(k, pink, [side * (spread + 0.09 * scale), y - 0.105 * scale, z + 0.025], [0.06 * scale, 0.025 * scale, 0.018]);
  }
}

function tooth(k: ModelKit, x: number, y: number, z: number): void {
  k.box(cream, [x, y, z], [0.055, 0.075, 0.035], k.group, 0.01);
}

function patch(k: ModelKit, color: number, p: Vec3, size = 0.16): void {
  k.box(color, p, [size, size * 0.8, 0.022], k.group, 0.012).rotation.z = -0.18;
  for (const side of [-1, 1]) {
    k.box(cream, [p[0] + side * size * 0.33, p[1], p[2] - 0.018], [0.022, size * 0.5, 0.015], k.group, 0);
  }
}

function silhouette(points: readonly Vec3[]): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (const p of points.slice(1)) shape.lineTo(p[0], p[1]);
  shape.closePath();
  return shape;
}

function ear(k: ModelKit, color: number, x: number, y: number, z: number, size = 0.16): void {
  const s = new THREE.Shape();
  s.moveTo(-size, 0);
  s.quadraticCurveTo(-size * 0.8, size, 0, size * 1.65);
  s.quadraticCurveTo(size * 0.85, size, size, 0);
  s.quadraticCurveTo(0, -size * 0.3, -size, 0);
  k.shape(color, s, 0.1, [x, y, z]);
  orb(k, pink, [x, y + size * 0.5, z - 0.015], [size * 0.4, size * 0.65, 0.018]);
}

function paws(k: ModelKit, color: number): void {
  for (const side of [-1, 1]) orb(k, color, [side * 0.2, -0.43, -0.06], [0.15, 0.105, 0.2]);
}

function skull(k: ModelKit, p: Vec3, size = 0.32): void {
  k.sphere(bone, p, [size, size * 0.9, size * 0.72], k.group, 12);
  k.box(bone, [p[0], p[1] - size * 0.64, p[2] - size * 0.2], [size * 1.25, size * 0.55, size], k.group, 0.06);
  for (const side of [-1, 1]) {
    orb(k, ink, [p[0] + side * size * 0.39, p[1], p[2] - size * 0.64], [size * 0.27, size * 0.31, 0.037]);
    orb(k, 0xbe9be7, [p[0] + side * size * 0.4, p[1] + 0.012, p[2] - size * 0.68], [0.028, 0.038, 0.018]);
    k.box(ink, [p[0] + side * size * 0.18, p[1] - size * 0.71, p[2] - size * 0.72], [0.018, size * 0.25, 0.012], k.group, 0);
  }
  orb(k, ink, [p[0], p[1] - size * 0.35, p[2] - size * 0.73], [0.04, 0.035, 0.025]);
}

function bird(k: ModelKit, color: number, skeletal: boolean): void {
  k.sphere(color, [0, -0.04, 0.03], [0.24, 0.32, 0.29]);
  if (skeletal) skull(k, [0, 0.2, -0.12], 0.23);
  else {
    k.sphere(color, [0, 0.18, -0.12], [0.28, 0.25, 0.25]);
    face(k, 0.22, -0.34, 0.105, 0.8);
  }
  const beak = k.cylinder(skeletal ? bone : 0xe4ae57, [0, 0.09, -0.45], 0.005, 0.1, 0.24, k.group, 8);
  beak.rotation.x = -Math.PI / 2;
  for (const side of [-1, 1]) {
    const wing = new THREE.Shape();
    wing.moveTo(0.15, 0.07);
    wing.bezierCurveTo(0.4, 0.34, 0.63, 0.35, 0.77, 0.2);
    wing.quadraticCurveTo(0.73, -0.07, 0.59, -0.23);
    wing.lineTo(0.55, -0.07);
    wing.lineTo(0.43, -0.27);
    wing.lineTo(0.39, -0.11);
    wing.quadraticCurveTo(0.22, -0.2, 0.15, 0.07);
    const mesh = k.shape(color, wing, 0.055, [0, 0, 0.06]);
    mesh.rotation.y = side < 0 ? Math.PI : 0;
    if (side < 0) mesh.position.z += 0.055;
    for (let i = 0; i < 3; i++) {
      k.tube(skeletal ? bone : 0x655878, [[side * 0.22, 0.08, 0.025], [side * (0.4 + i * 0.1), 0.13, 0.02], [side * (0.4 + i * 0.12), -0.1 + i * 0.035, 0.02]], 0.022);
    }
    orb(k, skeletal ? bone : 0xe4ae57, [side * 0.12, -0.34, -0.025], [0.07, 0.045, 0.13]);
  }
  k.shape(color, silhouette([[-0.15, -0.18, 0], [0, -0.48, 0], [0.15, -0.18, 0]]), 0.07, [0, 0, 0.23]);
}

function canine(k: ModelKit, color: number, undead: boolean): void {
  k.sphere(color, [0, -0.09, 0.1], [0.29, 0.27, 0.4]);
  k.sphere(color, [0, 0.15, -0.2], [0.31, 0.29, 0.27]);
  for (const side of [-1, 1]) {
    ear(k, color, side * 0.2, 0.3, -0.23, 0.12);
    for (const z of [-0.2, 0.32]) orb(k, color, [side * 0.22, -0.34, z], [0.105, 0.16, 0.14]);
  }
  orb(k, undead ? 0xa5b981 : 0xb5a7a2, [0, 0.055, -0.43], [0.21, 0.13, 0.2]);
  orb(k, ink, [0, 0.11, -0.59], [0.09, 0.065, 0.052]);
  face(k, 0.21, -0.41, 0.135, 0.85);
  k.tube(color, [[0, 0.0, 0.4], [0.12, 0.15, 0.53], [0.24, 0.31, 0.46]], 0.07);
  if (undead) {
    patch(k, 0x957597, [-0.18, 0.3, -0.4], 0.13);
    tooth(k, 0.12, -0.025, -0.57);
    k.box(0x774b5b, [0, -0.025, -0.18], [0.58, 0.08, 0.42], k.group, 0.025);
  } else {
    for (const side of [-1, 1]) {
      k.shape(0xafa5a3, silhouette([[0, 0.16, 0], [side * 0.2, -0.1, 0], [side * 0.08, -0.18, 0]]), 0.045, [0, -0.02, -0.28]);
    }
  }
}

const builders: Record<string, (k: ModelKit, color: number) => void> = {
  bookGhost(k, color) {
    k.box(color, [0, 0.04, 0.08], [0.74, 0.73, 0.25], k.group, 0.06, 'leather');
    k.box(cream, [0.04, 0.04, -0.09], [0.65, 0.64, 0.18], k.group, 0.025);
    k.box(0x946449, [-0.34, 0.04, -0.05], [0.13, 0.77, 0.32], k.group, 0.055, 'leather');
    for (let i = 0; i < 5; i++) {
      k.box(0xcbb993, [0.055, -0.18 + i * 0.105, -0.188], [0.57, 0.012, 0.012], k.group, 0);
    }
    for (const y of [-0.2, 0.24]) k.box(0xe8b969, [-0.35, y, -0.222], [0.13, 0.045, 0.018], k.group, 0.005, 'metal');
    k.shape(0xb178a2, silhouette([[0, 0, 0], [0.1, 0, 0], [0.1, -0.21, 0], [0.05, -0.16, 0], [0, -0.21, 0]]), 0.018, [0.2, -0.19, -0.21]);
    face(k, 0.11, -0.225, 0.145);
    for (const side of [-1, 1]) k.tube(0xcde6ef, [[side * 0.33, 0.0, 0], [side * 0.48, -0.08, -0.02], [side * 0.5, 0.09, -0.03]], 0.055);
    k.tube(0xcde6ef, [[0, -0.28, 0.07], [0, -0.45, 0.06], [0.13, -0.5, 0.04], [0.22, -0.43, 0.04]], 0.095);
  },
  pencilGhost(k, color) {
    k.cylinder(color, [0, 0.02, 0], 0.18, 0.18, 0.64, k.group, 6);
    for (const side of [-1, 1]) k.box(0xe8a339, [side * 0.115, 0.03, -0.142], [0.023, 0.58, 0.024], k.group, 0);
    k.cylinder(0xb2c6ce, [0, 0.36, 0], 0.19, 0.19, 0.13, k.group, 12, 'metal');
    for (const y of [0.32, 0.4]) k.torus(0xe0e4db, [0, y, 0], 0.184, 0.012, k.group, 'metal').rotation.x = Math.PI / 2;
    k.sphere(pink, [0, 0.47, 0], [0.18, 0.13, 0.18]);
    k.cylinder(0xeac390, [0, -0.4, 0], 0.18, 0.035, 0.23, k.group, 6);
    k.cylinder(ink, [0, -0.55, 0], 0.048, 0.005, 0.09, k.group, 6);
    face(k, 0.08, -0.18, 0.09, 0.7);
    for (const side of [-1, 1]) k.tube(0xd9eaf1, [[side * 0.15, -0.1, 0], [side * 0.3, -0.18, 0], [side * 0.32, -0.02, 0]], 0.047);
  },
  paperGhost(k) {
    // Two dihedral wings, raised center keel and folded trailing edges: an airplane, not a tetrahedron.
    for (const side of [-1, 1]) {
      const wing = k.shape(cream, silhouette([[0, -0.6, 0], [side * 0.65, 0.38, 0], [side * 0.12, 0.21, 0]]), 0.026, [0, 0, 0]);
      wing.rotation.x = Math.PI / 2;
      wing.rotation.y = side * 0.16;
      k.tube(0xa9c6d7, [[0, 0.035, -0.57], [side * 0.23, 0.04, 0.03], [side * 0.57, 0.085, 0.31]], 0.013);
      k.tube(0xd2dfdf, [[side * 0.1, -0.02, 0.17], [side * 0.35, 0.04, 0.24], [side * 0.61, 0.075, 0.35]], 0.02);
    }
    const keel = k.shape(0xd2dfdf, silhouette([[-0.58, 0, 0], [0.31, 0.02, 0], [0.2, -0.24, 0]]), 0.03, [0, 0, 0]);
    keel.rotation.y = -Math.PI / 2;
    k.shape(cream, silhouette([[-0.18, 0.015, 0], [0.18, 0.015, 0], [0, -0.19, 0]]), 0.04, [0, 0, -0.26]);
    face(k, -0.035, -0.27, 0.11, 0.75);
    k.tube(0xd6eaf5, [[0, -0.16, 0.18], [0, -0.27, 0.31], [0.14, -0.26, 0.42]], 0.035);
  },
  zombie(k, color) {
    k.box(0x746083, [0, -0.17, 0.02], [0.51, 0.4, 0.36], k.group, 0.1);
    k.sphere(color, [0, 0.2, -0.015], [0.33, 0.31, 0.29]);
    paws(k, 0x494253);
    for (const side of [-1, 1]) orb(k, color, [side * 0.34, -0.1, -0.1], [0.12, 0.2, 0.15]);
    face(k, 0.24, -0.29, 0.13);
    k.box(ink, [0.055, 0.02, -0.28], [0.21, 0.06, 0.025], k.group, 0.02);
    tooth(k, 0.015, 0.035, -0.3);
    tooth(k, 0.12, 0.035, -0.3);
    patch(k, 0xa7b684, [-0.15, 0.38, -0.245], 0.15);
    patch(k, 0xc09a79, [0.08, -0.19, -0.175]);
    for (let i = 0; i < 3; i++) k.box(ink, [-0.13 + i * 0.085, 0.48, 0], [0.045, 0.065, 0.12], k.group, 0.015).rotation.z = -0.2;
  },
  zombieDog(k, color) { canine(k, color, true); },
  crow(k) { bird(k, 0x3d364c, false); },
  wireGolem(k, color) {
    k.box(color, [0, -0.04, 0], [0.49, 0.55, 0.36], k.group, 0.09, 'metal');
    k.box(0x374752, [0, 0.23, -0.02], [0.55, 0.27, 0.39], k.group, 0.07, 'metal');
    face(k, 0.25, -0.22, 0.13, 0.8);
    for (const side of [-1, 1]) {
      k.tube(0xc99561, [[side * 0.23, 0.04, 0], [side * 0.4, -0.08, -0.03], [side * 0.39, -0.28, -0.1]], 0.073, k.group, 'metal');
      orb(k, color, [side * 0.4, -0.29, -0.1], [0.105, 0.11, 0.11]);
      k.tube(side < 0 ? 0x78d6d0 : 0xe8af5c, [[side * 0.17, 0.13, -0.21], [side * 0.22, -0.1, -0.26], [side * 0.08, -0.23, -0.21]], 0.033);
    }
    paws(k, 0x425767);
    k.tube(0xe8af5c, [[-0.15, 0.35, 0], [-0.14, 0.51, 0], [0.11, 0.49, 0], [0.16, 0.35, 0]], 0.032, k.group, 'metal');
    k.torus(0x91efe2, [0, -0.07, -0.2], 0.092, 0.022, k.group, 'glow');
  },
  sparkBot(k, color) {
    k.sphere(color, [0, 0, 0], [0.35, 0.34, 0.3], k.group, 12, 'metal');
    k.box(ink, [0, 0.08, -0.275], [0.43, 0.18, 0.08], k.group, 0.045, 'metal');
    for (const side of [-1, 1]) {
      orb(k, 0xb5f5e4, [side * 0.11, 0.09, -0.325], [0.046, 0.057, 0.025]);
      k.cylinder(0x697586, [side * 0.36, 0, 0], 0.1, 0.1, 0.18, k.group, 10, 'metal').rotation.z = Math.PI / 2;
      k.tube(0xe4b86d, [[side * 0.29, 0.22, 0], [side * 0.4, 0.38, 0], [side * 0.29, 0.49, 0]], 0.037, k.group, 'metal');
      orb(k, 0x98f3e9, [side * 0.28, 0.5, 0], [0.064, 0.07, 0.065]);
    }
    k.torus(0xd7b879, [0, -0.15, -0.26], 0.078, 0.026, k.group, 'metal');
    k.box(0x425767, [0, -0.35, 0], [0.41, 0.12, 0.28], k.group, 0.04, 'metal');
    k.tube(0x9feee7, [[-0.09, 0.43, 0], [-0.03, 0.52, 0], [0.025, 0.43, 0], [0.12, 0.52, 0]], 0.018, k.group, 'glow');
  },
  drone(k, color) {
    k.sphere(color, [0, 0.02, 0], [0.3, 0.19, 0.29], k.group, 12, 'metal');
    k.box(ink, [0, 0.025, -0.255], [0.36, 0.14, 0.07], k.group, 0.035);
    face(k, 0.045, -0.297, 0.105, 0.7);
    for (const side of [-1, 1]) {
      k.box(0x586978, [side * 0.32, 0.07, 0], [0.28, 0.07, 0.09], k.group, 0.02, 'metal');
      const rotor = k.torus(0x637085, [side * 0.46, 0.12, 0], 0.205, 0.028, k.group, 'metal');
      rotor.rotation.x = Math.PI / 2;
      k.cylinder(0xe4c387, [side * 0.46, 0.12, 0], 0.055, 0.055, 0.12, k.group, 8, 'metal');
      for (const angle of [0, Math.PI / 2]) k.box(0xd7e4df, [side * 0.46, 0.15, 0], [0.34, 0.018, 0.055], k.group, 0.012, 'metal').rotation.y = angle;
      k.tube(0x586978, [[side * 0.17, -0.1, 0.11], [side * 0.23, -0.25, 0.11], [side * 0.23, -0.25, -0.15]], 0.025, k.group, 'metal');
    }
    orb(k, 0x8aeee3, [0, 0.24, 0], [0.04, 0.05, 0.04]);
  },
  pufferfish(k, color) {
    k.sphere(color, [0, 0.015, 0], [0.38, 0.38, 0.36]);
    k.sphere(cream, [0, -0.105, -0.125], [0.29, 0.25, 0.26]);
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 7; i++) {
        const a = (i + row * 0.5) * Math.PI * 2 / 7;
        const y = (row - 1) * 0.23;
        const r = row === 1 ? 0.36 : 0.28;
        if (Math.cos(a) < -0.45) continue;
        const spike = k.cylinder(0xffd792, [Math.sin(a) * r, y, Math.cos(a) * r], 0.005, 0.047, 0.16, k.group, 5);
        spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.sin(a), y * 2, Math.cos(a)).normalize());
      }
    }
    face(k, 0.12, -0.345, 0.145);
    k.torus(0xda885d, [0, -0.07, -0.39], 0.047, 0.02);
    for (const side of [-1, 1]) {
      const fin = orb(k, 0xf6bc72, [side * 0.41, -0.025, 0], [0.16, 0.13, 0.05]);
      fin.rotation.z = side * 0.3;
    }
    k.shape(0xf6bc72, silhouette([[-0.15, 0.14, 0], [0, 0, 0], [-0.15, -0.14, 0]]), 0.06, [0.1, 0, 0.39]).rotation.y = Math.PI / 2;
  },
  sharkFin(k, color) {
    k.sphere(color, [0, 0, 0], [0.27, 0.25, 0.48]);
    k.sphere(0xd7e4df, [0, -0.105, -0.13], [0.23, 0.15, 0.37]);
    const dorsal = k.shape(color, silhouette([[-0.2, 0, 0], [0.12, 0.34, 0], [0.18, 0, 0]]), 0.055, [0, 0.18, 0]);
    dorsal.rotation.y = Math.PI / 2;
    for (const side of [-1, 1]) {
      const fin = k.shape(color, silhouette([[0, 0, 0], [side * 0.4, -0.17, 0], [side * 0.1, -0.22, 0]]), 0.045, [side * 0.16, -0.06, 0.01]);
      fin.rotation.x = 0.7;
      for (let i = 0; i < 3; i++) k.box(0x466278, [side * 0.244, 0.02, -0.09 + i * 0.067], [0.012, 0.1, 0.018], k.group, 0);
    }
    k.sphere(color, [0, 0, 0.43], [0.09, 0.09, 0.19]);
    const tail = k.shape(color, silhouette([[0, 0, 0], [-0.08, 0.26, 0], [0.18, 0.13, 0], [0.12, 0, 0], [0.19, -0.15, 0], [-0.06, -0.19, 0]]), 0.055, [0, 0, 0.62]);
    tail.rotation.y = Math.PI / 2;
    face(k, 0.06, -0.445, 0.115, 0.8);
    k.tube(ink, [[-0.13, -0.09, -0.43], [0, -0.14, -0.48], [0.13, -0.09, -0.43]], 0.015);
    tooth(k, -0.065, -0.125, -0.465);
    tooth(k, 0.065, -0.125, -0.465);
  },
  jellyfish(k, color) {
    k.lathe(color, [[0, 0.47], [0.14, 0.45], [0.3, 0.34], [0.39, 0.16], [0.4, 0.02], [0.34, -0.025], [0, 0.015]], [0, 0, 0]);
    k.torus(0xf9cddb, [0, 0.025, 0], 0.365, 0.045).rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      const x = Math.cos(a) * 0.24;
      const z = Math.sin(a) * 0.23;
      k.tube(i % 2 ? 0xc5b0e8 : 0xf2b9d3, [[x, 0.02, z], [x * 1.1, -0.19, z], [x * 0.7 + 0.07, -0.37, z + 0.03], [x + 0.09, -0.49, z]], 0.033);
    }
    face(k, 0.2, -0.345, 0.14, 0.9);
    for (const side of [-1, 1]) orb(k, cream, [side * 0.19, 0.34, -0.235], [0.035, 0.023, 0.018]);
  },
  ghoul(k, color) {
    k.lathe(0x5e546f, [[0, -0.42], [0.3, -0.4], [0.25, -0.08], [0.32, 0.12], [0.2, 0.28], [0, 0.3]], [0, 0, 0]);
    k.sphere(0x514960, [0, 0.23, 0], [0.34, 0.33, 0.28]);
    k.sphere(color, [0, 0.22, -0.18], [0.255, 0.24, 0.17]);
    face(k, 0.24, -0.35, 0.12, 0.9);
    for (const side of [-1, 1]) {
      k.tube(0x5e546f, [[side * 0.21, 0.02, 0], [side * 0.35, -0.09, -0.08], [side * 0.38, -0.23, -0.17]], 0.085);
      orb(k, color, [side * 0.38, -0.25, -0.17], [0.1, 0.12, 0.075]);
      tooth(k, side * 0.08, 0.025, -0.325);
    }
    k.tube(0xb6a688, [[-0.18, 0.06, -0.24], [0, -0.04, -0.29], [0.18, 0.06, -0.24]], 0.025);
    patch(k, 0x938474, [0.09, -0.24, -0.235], 0.14);
  },
  wolf(k, color) { canine(k, color, false); },
  bat(k) {
    k.sphere(0x635174, [0, 0, 0], [0.21, 0.3, 0.2]);
    k.sphere(0x756184, [0, 0.2, -0.045], [0.245, 0.22, 0.21]);
    for (const side of [-1, 1]) {
      ear(k, 0x635174, side * 0.145, 0.32, -0.06, 0.115);
      const wing = new THREE.Shape();
      wing.moveTo(0.16, 0.07);
      wing.quadraticCurveTo(0.38, 0.36, 0.72, 0.25);
      wing.lineTo(0.77, -0.12);
      wing.quadraticCurveTo(0.56, 0.0, 0.53, -0.27);
      wing.quadraticCurveTo(0.36, -0.1, 0.25, -0.3);
      wing.quadraticCurveTo(0.24, -0.07, 0.16, 0.07);
      const membrane = k.shape(0x9c729b, wing, 0.04, [0, 0, side < 0 ? 0.055 : 0.015]);
      membrane.rotation.y = side < 0 ? Math.PI : 0;
      k.tube(0x635174, [[side * 0.17, 0.09, -0.005], [side * 0.39, 0.26, -0.005], [side * 0.7, 0.24, -0.005], [side * 0.75, -0.1, -0.005]], 0.028);
      k.tube(0x635174, [[side * 0.39, 0.26, -0.012], [side * 0.48, 0.0, -0.012], [side * 0.53, -0.25, -0.012]], 0.017);
      tooth(k, side * 0.055, 0.005, -0.22);
    }
    face(k, 0.2, -0.24, 0.105, 0.8);
  },
  boneGolem(k) {
    k.box(0x837591, [0, -0.07, 0], [0.45, 0.43, 0.31], k.group, 0.06);
    skull(k, [0, 0.25, -0.01], 0.3);
    for (const side of [-1, 1]) {
      orb(k, bone, [side * 0.34, 0.01, 0], [0.14, 0.15, 0.15]);
      k.cylinder(bone, [side * 0.38, -0.19, 0], 0.075, 0.1, 0.29, k.group, 8);
      orb(k, bone, [side * 0.38, -0.32, -0.04], [0.12, 0.11, 0.14]);
    }
    for (const y of [-0.02, -0.13, -0.24]) k.tube(bone, [[-0.2, y + 0.035, -0.17], [0, y - 0.015, -0.23], [0.2, y + 0.035, -0.17]], 0.045);
    k.box(bone, [0, -0.12, -0.23], [0.06, 0.34, 0.05], k.group, 0.015);
    paws(k, bone);
  },
  skeletonSoldier(k) {
    skull(k, [0, 0.27, -0.01], 0.27);
    k.cylinder(bone, [0, -0.1, 0], 0.035, 0.04, 0.35, k.group, 8);
    for (const y of [-0.025, -0.12]) k.tube(bone, [[-0.18, y + 0.025, 0], [-0.15, y - 0.03, -0.12], [0, y - 0.05, -0.15], [0.18, y + 0.025, 0]], 0.031);
    k.box(bone, [0, -0.26, 0], [0.31, 0.12, 0.19], k.group, 0.04);
    for (const side of [-1, 1]) {
      k.tube(bone, [[side * 0.17, 0.015, 0], [side * 0.27, -0.1, -0.02], [side * 0.29, -0.22, -0.1]], 0.042);
      k.cylinder(bone, [side * 0.11, -0.38, 0], 0.04, 0.04, 0.2, k.group, 8);
      orb(k, bone, [side * 0.11, -0.48, -0.05], [0.083, 0.06, 0.13]);
    }
    k.box(0x8c849d, [0, 0.47, 0.015], [0.51, 0.09, 0.34], k.group, 0.035, 'metal');
    k.box(0xb4bec4, [0.34, -0.01, -0.16], [0.06, 0.46, 0.04], k.group, 0.015, 'metal').rotation.z = -0.12;
    k.box(0xbb975c, [0.315, -0.19, -0.16], [0.18, 0.035, 0.05], k.group, 0.01, 'metal');
  },
  skullBird(k) { bird(k, 0x7a6d85, true); },
};

export function createMonsterModel(def: Pick<MonsterDef, 'id' | 'color'>): THREE.Group {
  let template = templates.get(def.id);
  if (!template) {
    const build = builders[def.id];
    if (!build) throw new Error(`Unknown monster model: ${def.id}`);
    const kit = new ModelKit(1.35);
    kit.group.name = def.id;
    build(kit, def.color);
    template = bakeStaticModel(kit.group);
    templates.set(def.id, template);
  }
  return template.clone(true);
}
