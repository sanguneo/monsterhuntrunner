import * as THREE from 'three';
import { ModelKit, bakeStaticModel, type Vec3, type Surface } from './ModelKit';

// Standing local pivot at the feet, facing -Z. Every call owns its baked resources.
const ink = 0x302940;
const cream = 0xffedce;
const bone = 0xe8d9b8;
const gold = 0xd9ab60;
const silver = 0xa8bfca;
const blush = 0xe89aa7;

function round(k: ModelKit, color: number, p: Vec3, s: Vec3, surface: Surface = 'cloth'): THREE.Mesh {
  return k.sphere(color, p, s, k.group, 24, surface);
}
function bead(k: ModelKit, color: number, p: Vec3, s: Vec3, surface: Surface = 'cloth'): THREE.Mesh {
  return k.sphere(color, p, s, k.group, 12, surface);
}
function profile(points: readonly (readonly [number, number])[]): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(...points[0]);
  points.slice(1).forEach(p => s.lineTo(...p));
  s.closePath();
  return s;
}
function face(k: ModelKit, y: number, z: number, spread = 0.22, sleepy = false): void {
  for (const side of [-1, 1]) {
    bead(k, ink, [side * spread, y, z], [0.11, sleepy ? 0.105 : 0.145, 0.055], 'eye');
    bead(k, cream, [side * spread - 0.027, y + 0.05, z - 0.043], [0.032, 0.038, 0.02], 'eye');
    bead(k, blush, [side * (spread + 0.15), y - 0.16, z + 0.035], [0.105, 0.044, 0.025]);
    k.tube(ink, [[side * (spread - 0.09), y + 0.22, z + 0.045], [side * spread, y + 0.25, z + 0.04], [side * (spread + 0.08), y + 0.21, z + 0.065]], 0.021);
  }
  k.tube(ink, [[-0.09, y - 0.2, z + 0.015], [0, y - 0.225, z - 0.005], [0.09, y - 0.2, z + 0.015]], 0.019);
}
function hand(k: ModelKit, color: number, x: number, y: number, z: number, claws = false): void {
  round(k, color, [x, y, z], [0.21, 0.24, 0.19]);
  for (let i = 0; i < 3; i++) {
    const fx = x + (i - 1) * 0.11;
    bead(k, color, [fx, y - 0.12, z - 0.075], [0.075, 0.14, 0.1]);
    if (claws) {
      const nail = k.cylinder(cream, [fx, y - 0.255, z - 0.09], 0.055, 0.007, 0.15, k.group, 8);
      nail.rotation.x = -0.24;
    }
  }
  bead(k, color, [x - Math.sign(x) * 0.17, y + 0.015, z - 0.09], [0.09, 0.12, 0.11]);
}
function boots(k: ModelKit, color: number, metal = false): void {
  for (const side of [-1, 1]) {
    round(k, color, [side * 0.33, 0.28, -0.075], [0.27, 0.26, 0.38], metal ? 'metal' : 'leather');
    k.box(ink, [side * 0.33, 0.095, -0.075], [0.52, 0.1, 0.65], k.group, 0.045, 'leather');
    k.torus(metal ? silver : 0xb09b83, [side * 0.33, 0.37, -0.075], 0.205, 0.03, k.group, metal ? 'metal' : 'leather').rotation.x = Math.PI / 2;
  }
}
function sleeves(k: ModelKit, cloth: number, skin: number, y = 1.72, claws = false): void {
  for (const side of [-1, 1]) {
    round(k, cloth, [side * 0.64, y + 0.03, 0], [0.3, 0.42, 0.32]).rotation.z = side * 0.35;
    round(k, cloth, [side * 0.79, y - 0.31, -0.07], [0.24, 0.33, 0.25]).rotation.z = side * 0.16;
    k.torus(cream, [side * 0.83, y - 0.49, -0.075], 0.185, 0.04).rotation.x = Math.PI / 2;
    hand(k, skin, side * 0.84, y - 0.64, -0.1, claws);
  }
}
function robe(k: ModelKit, color: number, bottom = 0.15, top = 2.15): void {
  const h = top - bottom;
  k.lathe(color, [[0, 0], [0.58, 0], [0.68, 0.05], [0.7, 0.13], [0.66, h * 0.2], [0.57, h * 0.4], [0.49, h * 0.62], [0.51, h * 0.82], [0.62, h * 0.91], [0.44, h], [0, h]], [0, bottom, 0]);
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 2 * i / 7;
    k.tube(new THREE.Color(color).multiplyScalar(0.85).getHex(), [[Math.sin(a) * 0.65, bottom + 0.12, Math.cos(a) * 0.65], [Math.sin(a) * 0.58, bottom + h * 0.33, Math.cos(a) * 0.58], [Math.sin(a) * 0.49, bottom + h * 0.6, Math.cos(a) * 0.49]], 0.032);
  }
}
function cape(k: ModelKit, color: number, lining: number, wide = 0.92): void {
  const s = new THREE.Shape();
  s.moveTo(-0.46, 2.33);
  s.bezierCurveTo(-wide, 2.0, -wide * 0.93, 0.9, -wide, 0.28);
  s.quadraticCurveTo(-wide * 0.5, 0.08, 0, 0.2);
  s.quadraticCurveTo(wide * 0.5, 0.08, wide, 0.28);
  s.bezierCurveTo(wide * 0.93, 0.9, wide, 2.0, 0.46, 2.33);
  s.closePath();
  k.shape(color, s, 0.13, [0, 0, 0.31]);
  const inner = k.shape(lining, s, 0.025, [0, 0.035, 0.285]);
  inner.scale.set(0.93, 0.96, 1);
  for (const side of [-1, 1]) k.tube(gold, [[side * 0.46, 2.32, 0.26], [side * wide * 0.85, 1.3, 0.265], [side * wide * 0.94, 0.3, 0.265]], 0.025);
}
function crown(k: ModelKit, y: number, color = gold): void {
  k.cylinder(color, [0, y, 0], 0.47, 0.43, 0.14, k.group, 20, 'metal');
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7;
    const p: Vec3 = [Math.sin(a) * 0.44, y + 0.14, Math.cos(a) * 0.44];
    const prong = k.shape(color, profile([[-0.105, -0.1], [-0.055, 0.12], [0, 0.24], [0.055, 0.12], [0.105, -0.1]]), 0.055, p, k.group, 'metal');
    prong.rotation.y = a;
    bead(k, i % 2 ? 0x87d4cd : 0xb07bc6, [p[0] * 1.06, y + 0.12, p[2] * 1.06], [0.055, 0.08, 0.04], 'eye');
  }
  k.torus(cream, [0, y - 0.06, 0], 0.444, 0.027, k.group, 'metal').rotation.x = Math.PI / 2;
}
function seam(k: ModelKit, p: Vec3, length: number): void {
  k.tube(0x546453, [[p[0] - length / 2, p[1], p[2]], [p[0], p[1] - 0.025, p[2] - 0.015], [p[0] + length / 2, p[1] + 0.025, p[2]]], 0.017);
  for (let i = 0; i < 5; i++) {
    const stitch = k.box(cream, [p[0] - length * 0.4 + i * length * 0.2, p[1], p[2] - 0.025], [0.025, 0.09, 0.022], k.group, 0.006);
    stitch.rotation.z = -0.28;
  }
}
function skull(k: ModelKit, y = 2.62): void {
  round(k, bone, [0, y, 0], [0.54, 0.52, 0.43]);
  round(k, bone, [0, y - 0.28, -0.14], [0.36, 0.28, 0.31]);
  for (const side of [-1, 1]) {
    round(k, ink, [side * 0.21, y + 0.035, -0.37], [0.175, 0.19, 0.075]);
    bead(k, 0xb79ee9, [side * 0.21, y + 0.02, -0.436], [0.072, 0.096, 0.024], 'eye');
    bead(k, cream, [side * 0.21 - 0.02, y + 0.06, -0.457], [0.018, 0.025, 0.013], 'eye');
    bead(k, bone, [side * 0.37, y - 0.16, -0.2], [0.13, 0.1, 0.2]);
  }
  k.shape(ink, profile([[0, 0.06], [-0.065, -0.045], [0.065, -0.045]]), 0.025, [0, y - 0.14, -0.467]);
  for (let i = 0; i < 4; i++) k.box(ink, [-0.15 + i * 0.1, y - 0.41, -0.419], [0.02, 0.12, 0.025], k.group, 0.005);
}
function staff(k: ModelKit, x: number, color: number, royal = false): void {
  k.tube(gold, [[x, 0.12, -0.08], [x, 1.35, -0.12], [x, 2.7, -0.08]], 0.055, k.group, 'metal');
  for (const y of [0.3, 1.22, 2.56]) k.torus(cream, [x, y, -0.08], 0.068, 0.025, k.group, 'metal').rotation.x = Math.PI / 2;
  k.torus(gold, [x, 2.88, -0.08], 0.21, 0.04, k.group, 'metal');
  round(k, color, [x, 2.89, -0.08], [0.135, 0.17, 0.13], 'eye');
  if (royal) {
    for (const side of [-1, 1]) k.tube(bone, [[x + side * 0.07, 2.69, -0.08], [x + side * 0.23, 2.87, -0.08], [x + side * 0.12, 3.12, -0.08]], 0.03);
  } else {
    k.tube(0x91dfd8, [[x - 0.18, 2.78, -0.08], [x - 0.28, 3.04, -0.08], [x - 0.1, 3.19, -0.08], [x + 0.14, 3.12, -0.08]], 0.045);
  }
}

const builders: Record<string, (k: ModelKit) => void> = {
  ghostTeacher(k) {
    robe(k, 0x646d90, 0.22, 2.15);
    // A curling ectoplasm hem preserves the hovering teacher's ghost silhouette.
    for (const side of [-1, 1]) k.tube(0xc7e1e6, [[side * 0.36, 0.45, 0], [side * 0.42, 0.19, -0.05], [side * 0.25, 0.08, -0.09], [side * 0.09, 0.18, -0.1]], 0.105);
    round(k, 0xd5e5e5, [0, 2.6, 0], [0.56, 0.55, 0.44]);
    sleeves(k, 0x646d90, 0xd5e5e5);
    face(k, 2.65, -0.423, 0.22, true);
    for (const side of [-1, 1]) {
      k.torus(0x66524c, [side * 0.225, 2.64, -0.48], 0.18, 0.027, k.group, 'metal');
      k.tube(0x66524c, [[side * 0.4, 2.67, -0.47], [side * 0.53, 2.69, -0.23], [side * 0.5, 2.65, 0]], 0.025, k.group, 'metal');
      k.shape(cream, profile([[0, 0], [side * 0.34, 0.14], [side * 0.25, -0.24]]), 0.04, [0, 2.05, -0.5]);
    }
    k.tube(gold, [[-0.07, 2.67, -0.485], [0, 2.7, -0.49], [0.07, 2.67, -0.485]], 0.018, k.group, 'metal');
    k.shape(0xab7295, profile([[0, 0.1], [-0.09, 0], [-0.055, -0.39], [0, -0.47], [0.055, -0.39], [0.09, 0]]), 0.04, [0, 1.97, -0.54]);
    for (let i = 0; i < 4; i++) bead(k, 0xb2bdca, [0, 1.4 - i * 0.2, -0.53], [0.035, 0.035, 0.022], 'metal');
    for (let i = 0; i < 5; i++) round(k, 0xdce0df, [-0.38 + i * 0.18, 3.03 + Math.sin(i) * 0.025, 0.045], [0.16, 0.13, 0.28]);
    // Offset board leaves its chalk diagram readable beside, rather than behind, the face.
    k.box(0x936646, [-0.83, 1.89, 0.41], [1.02, 1.29, 0.13], k.group, 0.07, 'leather');
    k.box(0x285b58, [-0.83, 1.91, 0.323], [0.87, 1.12, 0.035], k.group, 0.02);
    k.tube(cream, [[-1.17, 2.23, 0.29], [-1.02, 2.4, 0.29], [-0.87, 2.23, 0.29], [-1.17, 2.23, 0.29]], 0.018);
    k.torus(cream, [-0.72, 2.28, 0.29], 0.09, 0.014);
    for (let i = 0; i < 3; i++) k.box(cream, [-0.87, 1.99 - i * 0.17, 0.29], [0.51 - i * 0.07, 0.025, 0.012], k.group, 0.005);
    k.box(0xb98559, [-0.83, 1.32, 0.25], [0.98, 0.07, 0.23], k.group, 0.02);
    k.tube(0xbf9768, [[0.86, 1.04, -0.25], [1.0, 1.92, -0.25], [1.18, 2.77, -0.25]], 0.035, k.group, 'leather');
    bead(k, cream, [1.18, 2.77, -0.25], [0.045, 0.065, 0.045]);
  },
  ghostGirl(k) {
    robe(k, 0xd8cce9, 0.2, 2.09);
    round(k, 0x7a638e, [0, 2.59, 0.1], [0.62, 0.63, 0.48]);
    round(k, 0xe6ecf0, [0, 2.6, -0.13], [0.5, 0.51, 0.37]);
    sleeves(k, 0xd8cce9, 0xe6ecf0, 1.72);
    face(k, 2.65, -0.484, 0.2);
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * 0.145;
      k.tube(0x7a638e, [[x * 0.72, 3.1, -0.12], [x, 2.96, -0.43], [x + 0.035, 2.81 + Math.abs(i - 3) * 0.035, -0.48]], 0.088);
    }
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        k.tube(i % 2 ? 0x88709d : 0x7a638e, [[side * (0.45 + i * 0.035), 2.85, i * 0.14], [side * (0.58 + i * 0.045), 2.32, i * 0.14], [side * (0.52 + i * 0.07), 1.72, i * 0.15], [side * (0.7 + i * 0.035), 1.53, i * 0.15]], 0.09);
      }
      const bow = round(k, 0xcd86b3, [side * 0.21, 3.15, -0.24], [0.24, 0.14, 0.115]);
      bow.rotation.z = side * 0.32;
      k.shape(0xcd86b3, profile([[0, 0], [side * 0.19, -0.02], [side * 0.3, -0.29], [side * 0.16, -0.23]]), 0.04, [side * 0.1, 3.1, -0.24]);
    }
    bead(k, 0xf2b2ce, [0, 3.15, -0.31], [0.1, 0.11, 0.09]);
    k.torus(cream, [0, 1.9, 0], 0.49, 0.045).rotation.x = Math.PI / 2;
    k.box(0xac90be, [0, 1.39, -0.48], [0.83, 0.11, 0.06], k.group, 0.02);
    for (let i = 0; i < 11; i++) {
      const a = i * Math.PI * 2 / 11;
      bead(k, cream, [Math.sin(a) * 0.65, 0.24, Math.cos(a) * 0.65], [0.13, 0.09, 0.1]);
    }
    k.tube(0xc4e2ed, [[0, 0.28, 0], [-0.12, 0.1, 0], [0.11, 0.04, 0], [0.27, 0.15, 0]], 0.115);
  },
  giantZombie(k) {
    boots(k, 0x5c4958);
    round(k, 0x677c8d, [0, 0.78, 0], [0.64, 0.53, 0.46]);
    round(k, 0x8aa26b, [0, 1.65, 0], [0.74, 0.72, 0.51]);
    sleeves(k, 0x84976e, 0x9aaf7a, 1.84);
    round(k, 0xa0b680, [0, 2.68, -0.04], [0.63, 0.55, 0.48]);
    face(k, 2.72, -0.5, 0.24, true);
    round(k, 0xa0b680, [0.025, 2.43, -0.16], [0.43, 0.25, 0.4]);
    k.box(ink, [0.05, 2.38, -0.545], [0.38, 0.12, 0.04], k.group, 0.045);
    for (const x of [-0.06, 0.07, 0.17]) k.box(cream, [x, 2.414, -0.57], [0.08, 0.09, 0.04], k.group, 0.012);
    seam(k, [-0.15, 2.98, -0.41], 0.49);
    seam(k, [0.18, 1.7, -0.51], 0.58);
    k.box(0xb69a75, [-0.3, 0.79, -0.444], [0.32, 0.3, 0.04], k.group, 0.035).rotation.z = -0.18;
    seam(k, [-0.3, 0.78, -0.473], 0.25);
    for (const side of [-1, 1]) {
      k.box(0x5f5269, [side * 0.32, 1.43, -0.47], [0.16, 1.17, 0.09], k.group, 0.025).rotation.z = side * 0.11;
      bead(k, gold, [side * 0.3, 1.55, -0.54], [0.062, 0.062, 0.03], 'metal');
    }
    for (let i = 0; i < 5; i++) round(k, 0x4e5b4d, [-0.37 + i * 0.18, 3.17, 0.02], [0.145, 0.1 + (i % 2) * 0.055, 0.3]);
  },
  zombieKing(k) {
    cape(k, 0x734c74, 0xad7489);
    boots(k, 0x514254);
    robe(k, 0x775e82, 0.35, 2.2);
    sleeves(k, 0x775e82, 0x98ad78, 1.8);
    round(k, 0x98ad78, [0, 2.62, 0], [0.57, 0.51, 0.44]);
    face(k, 2.65, -0.42, 0.22, true);
    crown(k, 3.14);
    seam(k, [-0.16, 2.92, -0.35], 0.4);
    k.box(ink, [0, 2.41, -0.442], [0.31, 0.09, 0.025], k.group, 0.025);
    for (const x of [-0.1, 0.07]) k.box(cream, [x, 2.43, -0.468], [0.085, 0.09, 0.04], k.group, 0.01);
    for (let i = 0; i < 9; i++) {
      const a = (i / 8 - 0.5) * Math.PI;
      bead(k, cream, [Math.sin(a) * 0.58, 2.03 - Math.cos(a) * 0.16, -Math.cos(a) * 0.44], [0.15, 0.13, 0.14]);
    }
    k.tube(gold, [[-0.37, 1.79, -0.46], [0, 1.54, -0.57], [0.37, 1.79, -0.46]], 0.032, k.group, 'metal');
    bead(k, 0xb79ae3, [0, 1.53, -0.59], [0.095, 0.12, 0.055], 'eye');
    for (let i = 0; i < 4; i++) k.box(gold, [0, 1.2 - i * 0.18, -0.6], [0.13, 0.045, 0.025], k.group, 0.01, 'metal');
  },
  lightningGolem(k) {
    boots(k, 0x566a80, true);
    for (const side of [-1, 1]) k.cylinder(0x627d91, [side * 0.33, 0.61, -0.02], 0.14, 0.12, 0.45, k.group, 12, 'metal');
    k.box(0x627d91, [0, 1.45, 0], [1.2, 1.42, 0.81], k.group, 0.19, 'metal');
    round(k, 0x7895a4, [0, 2.54, 0], [0.56, 0.51, 0.43], 'metal');
    k.box(ink, [0, 2.57, -0.4], [0.86, 0.28, 0.12], k.group, 0.08, 'metal');
    for (const side of [-1, 1]) {
      round(k, 0x9bdedb, [side * 0.21, 2.59, -0.48], [0.105, 0.08, 0.045], 'eye');
      round(k, 0x526b83, [side * 0.79, 1.86, 0], [0.28, 0.34, 0.31], 'metal');
      round(k, 0x7e939d, [side * 0.9, 1.38, 0], [0.25, 0.32, 0.26], 'metal');
      hand(k, 0x8da5ae, side * 0.94, 0.98, -0.09);
      k.cylinder(0x415268, [side * 0.83, 2.66, 0.09], 0.11, 0.14, 0.86, k.group, 16, 'metal');
      // Real continuous helical winding, not a stack of disconnected glowing balls.
      const winding: Vec3[] = [];
      for (let i = 0; i <= 56; i++) {
        const a = i * Math.PI * 2 / 8;
        winding.push([side * 0.83 + Math.cos(a) * 0.19, 2.28 + i * 0.012, 0.09 + Math.sin(a) * 0.19]);
      }
      k.tube(0xc99860, winding, 0.035, k.group, 'metal');
      round(k, silver, [side * 0.83, 3.06, 0.09], [0.24, 0.14, 0.24], 'metal');
      k.tube(0x8bece5, [[side * 0.62, 3.05, 0.09], [side * 0.4, 3.22, 0.07], [side * 0.33, 3.05, 0.04], [side * 0.12, 3.25, 0]], 0.025, k.group, 'glow');
      for (const y of [1.0, 1.91]) bead(k, gold, [side * 0.45, y, -0.43], [0.06, 0.06, 0.035], 'metal');
    }
    k.torus(gold, [0, 1.48, -0.46], 0.31, 0.065, k.group, 'metal');
    round(k, 0x7ad5d7, [0, 1.48, -0.47], [0.23, 0.23, 0.095], 'eye');
    k.tube(cream, [[0.04, 1.65, -0.565], [-0.07, 1.47, -0.58], [0.05, 1.47, -0.58], [-0.035, 1.31, -0.565]], 0.028, k.group, 'glow');
    for (let i = 0; i < 4; i++) k.box(ink, [-0.15 + i * 0.1, 2.31, -0.414], [0.05, 0.07, 0.025], k.group, 0.008);
  },
  frankenstein(k) {
    boots(k, 0x464457);
    round(k, 0x655779, [0, 0.74, 0], [0.55, 0.49, 0.38]);
    k.box(0x68647e, [0, 1.57, 0], [1.05, 1.2, 0.78], k.group, 0.18);
    sleeves(k, 0x68647e, 0x95bc97, 1.82);
    k.box(0x95bc97, [0, 2.64, 0], [1.03, 0.94, 0.8], k.group, 0.19);
    round(k, 0x95bc97, [0, 2.4, -0.12], [0.47, 0.3, 0.35]);
    face(k, 2.67, -0.405, 0.22);
    k.box(0x3e4256, [0, 3.07, 0.04], [1.06, 0.17, 0.79], k.group, 0.065);
    for (let i = 0; i < 6; i++) k.box(0x3e4256, [-0.42 + i * 0.165, 2.98 - (i % 2) * 0.03, -0.35], [0.12, 0.18, 0.095], k.group, 0.02);
    for (const side of [-1, 1]) {
      const bolt = k.cylinder(silver, [side * 0.59, 2.4, 0.01], 0.11, 0.11, 0.25, k.group, 6, 'metal');
      bolt.rotation.z = Math.PI / 2;
      const cap = k.cylinder(0x607887, [side * 0.73, 2.4, 0.01], 0.16, 0.16, 0.09, k.group, 6, 'metal');
      cap.rotation.z = Math.PI / 2;
      k.shape(0x454153, profile([[0, 0], [side * 0.39, 0.08], [side * 0.27, -0.48], [side * 0.07, -0.65]]), 0.05, [0, 2.1, -0.43]);
    }
    seam(k, [0.05, 2.86, -0.427], 0.56);
    seam(k, [-0.2, 1.48, -0.43], 0.32);
    k.box(0xc6b48d, [0.22, 1.47, -0.421], [0.24, 0.23, 0.035], k.group, 0.02);
    k.torus(gold, [0.22, 1.49, -0.45], 0.075, 0.018, k.group, 'metal');
    for (let i = 0; i < 3; i++) bead(k, silver, [0, 1.32 - i * 0.2, -0.421], [0.037, 0.038, 0.025], 'metal');
  },
  kraken(k) {
    round(k, 0x9a72bc, [0, 2.13, 0.08], [0.75, 0.98, 0.66]);
    round(k, 0xba90ce, [0, 1.65, -0.09], [0.68, 0.47, 0.59]);
    face(k, 2.14, -0.556, 0.27);
    k.torus(0xdfb3dc, [0, 1.8, -0.674], 0.105, 0.044);
    for (let i = 0; i < 8; i++) {
      const a = Math.PI * 2 * i / 8;
      const dx = Math.sin(a), dz = Math.cos(a);
      const points: Vec3[] = [[dx * 0.46, 1.48, dz * 0.43], [dx * 0.8, 0.92, dz * 0.68], [dx * 1.04, 0.28, dz * 0.86], [dx * 1.24, 0.27, dz * 1.04], [dx * 1.3, 0.57, dz * 1.09], [dx * 1.14, 0.71, dz * 0.98]];
      k.tube(i % 2 ? 0x9a72bc : 0xaa80c6, points, 0.145);
      // Underside cups follow the curl, with inset dark wells (visible from side/front).
      for (let j = 0; j < 6; j++) {
        const t = j / 5;
        const r = 0.61 + t * 0.6;
        const y = j < 4 ? 1.17 - j * 0.27 : 0.32 + (j - 4) * 0.2;
        const cup = k.mesh(new THREE.TorusGeometry(0.061 - t * 0.015, 0.022, 5, 12), 0xefbbd8, [dx * r, y, dz * r - 0.115]);
        cup.rotation.y = a * 0.25;
        bead(k, 0x775087, [dx * r, y, dz * r - 0.121], [0.033, 0.036, 0.015]);
      }
    }
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 2 * i / 7;
      bead(k, 0xd6a4d7, [Math.sin(a) * 0.57, 2.68 + (i % 2) * 0.12, Math.cos(a) * 0.48], [0.11, 0.065, 0.06]);
    }
    for (const side of [-1, 1]) round(k, 0xaa80c6, [side * 0.69, 2.27, 0.1], [0.21, 0.37, 0.12]).rotation.z = side * 0.32;
  },
  seaWitch(k) {
    robe(k, 0x476c8f, 0.12, 2.15);
    round(k, 0x7282aa, [0, 2.62, 0.09], [0.6, 0.57, 0.47]);
    round(k, 0xa2d2cd, [0, 2.61, -0.12], [0.49, 0.49, 0.37]);
    sleeves(k, 0x527c99, 0xa2d2cd, 1.75);
    face(k, 2.65, -0.474, 0.2);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        k.tube(i % 2 ? 0x758fb4 : 0x597f9f, [[side * (0.34 + i * 0.055), 3.0, i * 0.12], [side * (0.55 + i * 0.04), 2.58, i * 0.1], [side * (0.62 + i * 0.06), 1.95, i * 0.14], [side * (0.81 + i * 0.035), 2.04, i * 0.14]], 0.092);
      }
      k.tube(0x597f9f, [[side * 0.12, 3.04, -0.2], [side * 0.27, 2.91, -0.43], [side * 0.45, 2.72, -0.36]], 0.105);
      bead(k, cream, [side * 0.47, 2.4, -0.23], [0.055, 0.07, 0.055], 'eye');
    }
    crown(k, 3.1, 0x8fd9d3);
    staff(k, 1.05, 0x9c83cb);
    for (let i = 0; i < 9; i++) {
      const a = (i / 8 - 0.5) * Math.PI;
      bead(k, cream, [Math.sin(a) * 0.42, 2.01 - Math.cos(a) * 0.2, -Math.cos(a) * 0.45], [0.049, 0.05, 0.049], 'eye');
    }
    // Shell brooch is a scalloped fan with relief ribs.
    const shell = new THREE.Shape();
    shell.moveTo(0, 0);
    shell.bezierCurveTo(-0.33, 0.12, -0.32, 0.32, -0.2, 0.34);
    shell.quadraticCurveTo(0, 0.45, 0.2, 0.34);
    shell.bezierCurveTo(0.32, 0.32, 0.33, 0.12, 0, 0);
    k.shape(0xc2a3cc, shell, 0.045, [0, 1.37, -0.55]);
    for (let i = -2; i <= 2; i++) k.tube(cream, [[0, 1.4, -0.57], [i * 0.06, 1.55, -0.585], [i * 0.085, 1.7, -0.57]], 0.012);
  },
  werewolfChief(k) {
    boots(k, 0x76677e);
    for (const side of [-1, 1]) bead(k, 0x75677c, [side * 0.3, 0.57, -0.02], [0.2, 0.3, 0.23]);
    round(k, 0x75677c, [0, 1.39, 0], [0.64, 0.81, 0.47]);
    round(k, 0xb5a291, [0, 1.63, -0.31], [0.43, 0.52, 0.24]);
    sleeves(k, 0x75677c, 0x88758c, 1.86, true);
    round(k, 0x88758c, [0, 2.62, 0], [0.58, 0.53, 0.45]);
    for (const side of [-1, 1]) {
      const ear = new THREE.Shape();
      ear.moveTo(-0.2, 0);
      ear.quadraticCurveTo(-0.2, 0.24, 0, 0.48);
      ear.quadraticCurveTo(0.2, 0.24, 0.2, 0);
      ear.closePath();
      k.shape(0x88758c, ear, 0.15, [side * 0.38, 2.92, -0.05]);
      bead(k, 0xc18f9f, [side * 0.38, 3.1, -0.068], [0.09, 0.17, 0.027]);
      for (let i = 0; i < 4; i++) {
        const tuft = round(k, i % 2 ? 0xb5a291 : 0x9d8c91, [side * (0.41 + i * 0.07), 2.3 - i * 0.15, 0.02], [0.22, 0.26, 0.25]);
        tuft.rotation.z = side * (0.35 + i * 0.13);
      }
    }
    face(k, 2.72, -0.424, 0.235);
    round(k, 0xb8a79a, [0, 2.46, -0.36], [0.37, 0.22, 0.33]);
    round(k, ink, [0, 2.56, -0.65], [0.15, 0.1, 0.065], 'eye');
    k.tube(ink, [[-0.23, 2.38, -0.55], [0, 2.32, -0.65], [0.23, 2.38, -0.55]], 0.023);
    for (const side of [-1, 1]) k.cylinder(cream, [side * 0.19, 2.3, -0.58], 0.047, 0.01, 0.15, k.group, 8);
    k.tube(0x9c5e71, [[-0.42, 2.1, -0.32], [0, 1.93, -0.55], [0.42, 2.1, -0.32]], 0.08);
    bead(k, gold, [0, 1.95, -0.63], [0.11, 0.12, 0.055], 'metal');
    k.tube(0x75677c, [[0, 0.74, 0.35], [0.34, 0.62, 0.67], [0.6, 0.92, 0.75], [0.52, 1.13, 0.72]], 0.15);
  },
  dracula(k) {
    cape(k, 0x44334f, 0x995c76, 1.02);
    boots(k, 0x3e354e);
    round(k, 0x493b58, [0, 0.79, 0], [0.48, 0.5, 0.36]);
    round(k, 0xeee0ce, [0, 1.65, -0.01], [0.51, 0.55, 0.38]);
    sleeves(k, 0x493b58, 0xddcedf, 1.8);
    round(k, 0x4a3b58, [0, 2.64, 0.08], [0.59, 0.59, 0.45]);
    round(k, 0xddcedf, [0, 2.6, -0.11], [0.51, 0.49, 0.36]);
    face(k, 2.66, -0.455, 0.21);
    // Widow's peak and swept locks, not a sphere painted black.
    k.shape(0x4a3b58, profile([[-0.46, 0.1], [-0.37, 0.26], [0.37, 0.26], [0.46, 0.1], [0.17, 0.09], [0, -0.1], [-0.17, 0.09]]), 0.11, [0, 2.91, -0.43]);
    for (const side of [-1, 1]) {
      k.tube(0x4a3b58, [[side * 0.4, 3.01, -0.28], [side * 0.51, 2.75, -0.26], [side * 0.46, 2.5, -0.24]], 0.085);
      const collar = new THREE.Shape();
      collar.moveTo(side * 0.12, 1.99);
      collar.lineTo(side * 0.72, 2.68);
      collar.quadraticCurveTo(side * 0.92, 2.05, side * 0.5, 1.84);
      collar.closePath();
      k.shape(0x995c76, collar, 0.08, [0, 0, 0.02]);
      k.tube(gold, [[side * 0.14, 2.03, -0.005], [side * 0.44, 2.36, -0.005], [side * 0.71, 2.65, -0.005]], 0.021, k.group, 'metal');
      k.shape(0x864f6d, profile([[0, 0], [side * 0.44, 0.2], [side * 0.4, -0.5], [side * 0.12, -0.62], [0, -0.46]]), 0.06, [0, 1.89, -0.41]);
      k.shape(cream, profile([[0, 0], [side * 0.22, 0.13], [side * 0.21, -0.13]]), 0.04, [0, 2.06, -0.445]);
      bead(k, 0x71445d, [side * 0.12, 1.99, -0.49], [0.12, 0.07, 0.06]);
      k.cylinder(cream, [side * 0.075, 2.38, -0.447], 0.036, 0.008, 0.13, k.group, 8);
    }
    bead(k, gold, [0, 1.99, -0.54], [0.04, 0.055, 0.035], 'metal');
    for (let i = 0; i < 4; i++) bead(k, gold, [0.055, 1.79 - i * 0.14, -0.49], [0.028, 0.032, 0.02], 'metal');
    k.tube(gold, [[0.12, 1.54, -0.495], [0.27, 1.35, -0.5], [0.4, 1.58, -0.47]], 0.017, k.group, 'metal');
  },
  skeletonKnight(k) {
    cape(k, 0x65738a, 0x8796aa, 0.82);
    boots(k, 0x6c8294, true);
    for (const side of [-1, 1]) k.cylinder(0x64788d, [side * 0.33, 0.6, 0], 0.13, 0.11, 0.45, k.group, 12, 'metal');
    round(k, 0x64788d, [0, 1.15, 0], [0.51, 0.65, 0.39], 'metal');
    round(k, 0x98adba, [0, 1.78, -0.05], [0.59, 0.48, 0.43], 'metal');
    skull(k, 2.62);
    for (const side of [-1, 1]) {
      round(k, 0x71899c, [side * 0.69, 1.97, 0], [0.35, 0.26, 0.36], 'metal');
      k.tube(bone, [[side * 0.67, 1.85, 0], [side * 0.83, 1.51, -0.01], [side * 0.81, 1.14, -0.1]], 0.09);
      round(k, 0x98adba, [side * 0.81, 1.36, -0.05], [0.2, 0.24, 0.2], 'metal');
      hand(k, bone, side * 0.82, 1.07, -0.12);
      for (let i = 0; i < 3; i++) k.tube(silver, [[side * 0.1, 1.81 - i * 0.15, -0.473], [side * 0.32, 1.83 - i * 0.15, -0.43], [side * 0.48, 1.89 - i * 0.15, -0.32]], 0.035, k.group, 'metal');
    }
    round(k, 0x728a9c, [0, 2.98, 0.09], [0.56, 0.27, 0.44], 'metal');
    k.box(silver, [0, 2.91, -0.381], [1.03, 0.095, 0.12], k.group, 0.035, 'metal');
    k.shape(0x9b739f, profile([[-0.08, 0], [-0.11, 0.26], [0, 0.4], [0.11, 0.26], [0.08, 0]]), 0.31, [0, 3.09, -0.05]);
    const shield = new THREE.Shape();
    shield.moveTo(-0.4, 0.46);
    shield.quadraticCurveTo(0, 0.65, 0.4, 0.46);
    shield.lineTo(0.38, -0.15);
    shield.quadraticCurveTo(0.3, -0.45, 0, -0.59);
    shield.quadraticCurveTo(-0.3, -0.45, -0.38, -0.15);
    shield.closePath();
    k.shape(gold, shield, 0.1, [-0.91, 1.29, -0.46], k.group, 'metal');
    const panel = k.shape(0x687c97, shield, 0.035, [-0.91, 1.29, -0.5], k.group, 'metal');
    panel.scale.set(0.86, 0.86, 1);
    k.box(silver, [-0.91, 1.3, -0.53], [0.075, 0.7, 0.035], k.group, 0.015, 'metal');
    k.box(silver, [-0.91, 1.4, -0.53], [0.47, 0.075, 0.035], k.group, 0.015, 'metal');
    bead(k, 0xbaa0dc, [-0.91, 1.4, -0.58], [0.09, 0.11, 0.045], 'eye');
    k.shape(silver, profile([[-0.065, 0], [-0.085, 1.2], [0, 1.39], [0.085, 1.2], [0.065, 0]]), 0.055, [0.94, 1.18, -0.19], k.group, 'metal');
    k.box(gold, [0.94, 1.21, -0.18], [0.39, 0.075, 0.12], k.group, 0.025, 'metal');
    k.box(0x635164, [0.94, 1.02, -0.18], [0.09, 0.3, 0.09], k.group, 0.025, 'leather');
  },
  skullKing(k) {
    cape(k, 0x624b81, 0x9a78a8);
    robe(k, 0x735789, 0.13, 2.17);
    sleeves(k, 0x735789, bone, 1.76);
    skull(k, 2.61);
    crown(k, 3.15, gold);
    staff(k, 1.06, 0xb497df, true);
    for (const side of [-1, 1]) {
      k.shape(gold, profile([[0, 0], [side * 0.29, -0.08], [side * 0.37, -1.76], [side * 0.21, -1.8]]), 0.025, [0, 1.99, -0.52], k.group, 'metal');
      for (let i = 0; i < 4; i++) k.tube(bone, [[side * 0.06, 1.78 - i * 0.17, -0.535], [side * 0.2, 1.81 - i * 0.17, -0.49], [side * 0.33, 1.89 - i * 0.17, -0.43]], 0.038);
    }
    for (let i = 0; i < 9; i++) {
      const a = (i / 8 - 0.5) * Math.PI;
      bead(k, cream, [Math.sin(a) * 0.56, 2.05 - Math.cos(a) * 0.15, -Math.cos(a) * 0.44], [0.14, 0.12, 0.13]);
    }
    k.tube(gold, [[-0.34, 1.95, -0.45], [0, 1.69, -0.59], [0.34, 1.95, -0.45]], 0.026, k.group, 'metal');
    bead(k, 0xb28ad3, [0, 1.69, -0.61], [0.1, 0.13, 0.055], 'eye');
    for (let i = 0; i < 7; i++) bead(k, gold, [-0.42 + i * 0.14, 0.24, -Math.sqrt(0.65 ** 2 - (-0.42 + i * 0.14) ** 2)], [0.035, 0.045, 0.025], 'metal');
  },
};

export function createBossModel(id: string): THREE.Group {
  const build = builders[id];
  if (!build) throw new Error(`Unknown boss model: ${id}`);
  const kit = new ModelKit(1.35);
  kit.group.name = id;
  build(kit);
  // One merged mesh per material means the existing fade and dispose each touch it once.
  return bakeStaticModel(kit.group);
}
