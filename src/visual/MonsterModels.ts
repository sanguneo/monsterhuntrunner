import * as THREE from 'three';
import type { MonsterDef } from '../data/worlds';
import { bakeStaticModel, type Vec3, type Surface } from './ModelKit';
import { SculptKit, sweepGeometry, type Ring } from './SculptKit';

/** Small enemies use a compact authored mesh budget, independent of hero/boss detail. */
class MonsterKit extends SculptKit {
  override loft(
    color: number,
    profile: readonly Ring[],
    position: Vec3 = [0, 0, 0],
    parent = this.group,
    surface: Surface = 'cloth',
    rings = 20,
    sides = 20,
  ): THREE.Mesh {
    return super.loft(color, profile, position, parent, surface, Math.min(rings, 24), Math.min(sides, 20));
  }
  override sweep(
    color: number,
    points: readonly Vec3[],
    widths: readonly number[],
    depths = widths,
    parent = this.group,
    surface: Surface = 'cloth',
    steps = 16,
  ): THREE.Mesh {
    return this.mesh(
      sweepGeometry(points, widths, depths, Math.min(steps, 18), 8),
      color,
      [0, 0, 0],
      [1, 1, 1],
      parent,
      surface,
    );
  }
}

// Every species is a deliberately authored silhouette. Front is -Z; pivot is body centre.
const templates = new Map<string, THREE.Group>();
const ink = 0x302a42,
  cream = 0xffecd0,
  pink = 0xe7a1ac,
  gold = 0xe0b871,
  bone = 0xe6d8be;
const pear = [
  [-0.46, 0, 0],
  [-0.41, 0.2, 0.18],
  [-0.24, 0.3, 0.23],
  [0.02, 0.29, 0.24],
  [0.24, 0.34, 0.27],
  [0.42, 0.25, 0.22],
  [0.49, 0, 0],
] as const;
function head(k: SculptKit, c: number, p: Vec3 = [0, 0, 0], s = 1): THREE.Mesh {
  const m = k.loft(
    c,
    [
      [-0.24, 0, 0],
      [-0.21, 0.17, 0.14],
      [-0.1, 0.29, 0.24],
      [0.08, 0.3, 0.25],
      [0.25, 0.22, 0.19],
      [0.3, 0, 0],
    ],
    p,
  );
  m.scale.setScalar(s);
  return m;
}
function ears(k: SculptKit, c: number, x = 0.2, y = 0.33, z = 0): void {
  for (const side of [-1, 1]) {
    const ear = k.loft(
      c,
      [
        [0, 0, 0],
        [0.035, 0.095, 0.055],
        [0.12, 0.085, 0.045],
        [0.22, 0.04, 0.025],
        [0.255, 0, 0],
      ],
      [side * x, y - 0.06, z],
      undefined,
      'cloth',
      16,
      16,
    );
    ear.rotation.z = -side * 0.13;
    const inner = k.loft(
      0xc39da6,
      [
        [0.045, 0, 0],
        [0.08, 0.045, 0.008],
        [0.16, 0.035, 0.008],
        [0.205, 0, 0],
      ],
      [side * x, y - 0.06, z - 0.045],
      undefined,
      'cloth',
      10,
      12,
    );
    inner.rotation.z = -side * 0.13;
  }
}
function limb(k: SculptKit, c: number, side: number, y = 0.02): void {
  k.sweep(
    c,
    [
      [side * 0.22, y + 0.12, 0.025],
      [side * 0.34, y - 0.05, -0.015],
      [side * 0.37, y - 0.2, -0.09],
    ],
    [0.09, 0.075, 0.065, 0.05, 0],
    [0.08, 0.07, 0.06, 0.045, 0],
  );
}
function feet(k: SculptKit, c: number): void {
  for (const side of [-1, 1])
    k.sweep(
      c,
      [
        [side * 0.16, -0.29, 0.02],
        [side * 0.17, -0.41, -0.015],
        [side * 0.17, -0.42, -0.15],
      ],
      [0.085, 0.08, 0],
      [0.075, 0.065, 0],
      undefined,
      'cloth',
      16,
    );
}
function petal(k: SculptKit, c: number, points: readonly Vec3[], w = 0.15, d = 0.035): void {
  k.sweep(c, points, [0, w, w * 0.6, 0], [0, d, d * 0.8, 0]);
}
function patch(k: SculptKit, p: Vec3, c: number): void {
  const m = k.box(c, p, [0.12, 0.13, 0.014], undefined, 0.025);
  m.rotation.z = 0.2;
  for (const x of [-0.04, 0.04])
    k.tube(
      cream,
      [
        [p[0] + x, p[1] - 0.025, p[2] - 0.009],
        [p[0] + x + 0.015, p[1] + 0.025, p[2] - 0.009],
      ],
      0.006,
    );
}
function canine(k: SculptKit, c: number, undead: boolean): void {
  // Continuous muzzle / brow / neck / lean torso; the silhouette carries species identity.
  const body = k.loft(
    c,
    [
      [-0.76, 0, 0, 0, -0.1],
      [-0.71, 0.095, 0.075, 0, -0.1],
      [-0.56, 0.14, 0.12, 0, -0.13],
      [-0.42, 0.215, 0.23, 0, -0.18],
      [-0.25, 0.21, 0.26, 0, -0.12],
      [-0.06, 0.19, 0.2, 0, 0.015],
      [0.19, 0.2, 0.17, 0, 0.02],
      [0.43, 0.21, 0.19, 0, 0.015],
      [0.6, 0.13, 0.14, 0, 0.02],
      [0.66, 0, 0, 0, 0.02],
    ],
    undefined,
    undefined,
    'cloth',
    24,
    20,
  );
  body.rotation.x = Math.PI / 2;
  if (undead) {
    for (const side of [-1, 1])
      k.sweep(
        0x77624d,
        [
          [side * 0.17, 0.3, -0.4],
          [side * 0.29, 0.19, -0.39],
          [side * 0.31, -0.02, -0.37],
          [side * 0.24, -0.07, -0.41],
        ],
        [0.05, 0.105, 0.08, 0],
        [0.025, 0.045, 0.04, 0],
      );
  } else ears(k, c, 0.17, 0.36, -0.37);
  for (const side of [-1, 1]) {
    const lift = side === -1 ? 0.075 : 0;
    // Longitudinal leg profiles keep a smooth knee/hock and a closed rounded paw.
    k.loft(
      c,
      [
        [-0.52 + lift, 0, 0, 0, -0.1],
        [-0.5 + lift, 0.055, 0.09, 0, -0.1],
        [-0.45 + lift, 0.06, 0.085, 0, -0.075],
        [-0.34 + lift, 0.043, 0.05, 0, -0.045],
        [-0.18, 0.06, 0.065, 0, 0.025],
        [0.02, 0.09, 0.1, 0, 0.01],
        [0.09, 0, 0],
      ],
      [side * 0.18, 0, -0.29],
      undefined,
      'cloth',
      16,
      12,
    );
    k.loft(
      c,
      [
        [-0.52, 0, 0, 0, -0.06],
        [-0.5, 0.055, 0.095, 0, -0.06],
        [-0.44, 0.055, 0.08, 0, -0.035],
        [-0.32, 0.04, 0.05, 0, 0.07],
        [-0.17, 0.075, 0.08, 0, -0.045],
        [0.015, 0.1, 0.11],
        [0.09, 0, 0],
      ],
      [side * 0.18, 0, 0.4],
      undefined,
      'cloth',
      16,
      12,
    );
    k.surfaceEye([side * 0.13, 0.23, -0.59], 0.82);
  }
  k.sphere(ink, [0, 0.1, -0.728], [0.067, 0.044, 0.034], undefined, 12, 'eye');
  k.sweep(
    undead ? c : 0xa8a3aa,
    [
      [0, 0.015, 0.5],
      [0.12, 0.15, 0.72],
      [0.3, 0.23, 0.86],
      [0.43, 0.2, 0.91],
      [0.52, 0.12, 0.94],
    ],
    undead ? [0.065, 0.07, 0.06, 0.035, 0] : [0.09, 0.15, 0.14, 0.095, 0],
  );
  k.sweep(
    cream,
    [
      [-0.085, 0.045, -0.66],
      [0, 0.025, -0.72],
      [0.085, 0.045, -0.66],
    ],
    [0, 0.012, 0],
  );
  if (undead) patch(k, [-0.13, 0.28, -0.57], 0xa78b9c);
  else {
    // A continuous light throat bib rather than a stack of separate cheek tufts.
    const pos = body.geometry.getAttribute('position'),
      colors: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const pale = pos.getZ(i) > 0.045 && pos.getY(i) < 0.1;
      const col = new THREE.Color(pale ? 0xd5c9b8 : c);
      colors.push(col.r, col.g, col.b);
    }
    body.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mat = k.material(c).clone();
    mat.color.setHex(0xffffff);
    mat.vertexColors = true;
    body.material = mat;
  }
}
function bird(k: SculptKit, c: number, skeletal = false): void {
  const body = k.loft(c, [
    [-0.35, 0, 0],
    [-0.29, 0.14, 0.17],
    [-0.05, 0.23, 0.25],
    [0.2, 0.26, 0.23, 0, -0.08],
    [0.37, 0.17, 0.16, 0, -0.09],
    [0.42, 0, 0, 0, -0.08],
  ]);
  if (skeletal) {
    const positions = body.geometry.getAttribute('position'),
      colors: number[] = [];
    for (let i = 0; i < positions.count; i++) {
      const tint = new THREE.Color(positions.getY(i) > 0.045 ? bone : c);
      colors.push(tint.r, tint.g, tint.b);
    }
    body.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const material = k.material(c).clone();
    material.color.setHex(0xffffff);
    material.vertexColors = true;
    body.material = material;
  }
  for (const side of [-1, 1]) {
    k.surfaceEye([side * 0.108, 0.24, -0.292], skeletal ? 1 : 0.83);
    if (!skeletal) {
      const wing = new THREE.Shape();
      wing.moveTo(side * 0.15, 0.13);
      wing.bezierCurveTo(side * 0.35, 0.42, side * 0.65, 0.44, side * 0.84, 0.23);
      wing.quadraticCurveTo(side * 0.66, 0.16, side * 0.44, 0.04);
      wing.quadraticCurveTo(side * 0.27, -0.01, side * 0.15, 0.02);
      wing.closePath();
      k.shape(c, wing, 0.035, [0, 0, -0.04]);
      // Planar overlapping feather vanes: broad curved surfaces, not sweep tubes.
      for (let i = 0; i < 5; i++) {
        const sx = side * (0.24 + i * 0.085),
          sy = 0.21 + i * 0.013,
          tx = side * (0.43 + i * 0.115),
          ty = -0.12 + i * 0.045;
        const dx = tx - sx,
          dy = ty - sy,
          len = Math.hypot(dx, dy),
          nx = (-dy / len) * 0.07,
          ny = (dx / len) * 0.07;
        const f = new THREE.Shape();
        f.moveTo(sx - nx, sy - ny);
        f.bezierCurveTo(sx + dx * 0.4 - nx, sy + dy * 0.4 - ny, tx - nx, ty - ny, tx, ty);
        f.bezierCurveTo(tx + nx * 0.3, ty + ny * 0.3, sx + dx * 0.4 + nx, sy + dy * 0.4 + ny, sx + nx, sy + ny);
        f.closePath();
        k.shape(i % 2 ? 0x51475f : c, f, 0.018, [0, 0, 0.02 + i * 0.002]);
      }
    } else
      for (let i = 0; i < 3; i++)
        petal(
          k,
          bone,
          [
            [side * 0.15, 0.13, 0.02],
            [side * (0.46 + i * 0.055), 0.17 - i * 0.07, 0.02],
            [side * (0.69 - i * 0.09), -0.07 - i * 0.08, 0.03],
          ],
          0.1 - i * 0.012,
          0.035,
        );
    k.sweep(
      gold,
      [
        [side * 0.1, -0.29, -0.02],
        [side * 0.12, -0.35, -0.07],
        [side * 0.12, -0.34, -0.18],
      ],
      [0.035, 0.035, 0],
      undefined,
      undefined,
      'cloth',
      12,
    );
  }
  k.sweep(
    skeletal ? bone : 0x393140,
    [
      [0, 0.13, -0.24],
      [0, 0.12, -0.4],
      [0, 0.015, -0.56],
    ],
    [0.08, 0.075, 0],
    [0.055, 0.045, 0],
  );
  petal(
    k,
    c,
    [
      [0, -0.1, 0.15],
      [0, -0.32, 0.34],
      [0, -0.37, 0.44],
    ],
    0.12,
    0.025,
  );
  if (skeletal) {
    for (const y of [-0.08, -0.17]) {
      const points: Vec3[] = [
        [-0.12, y, 0],
        [0, y - 0.025, 0],
        [0.12, y, 0],
      ].map((p) => {
        const hit = k.surfacePoint(p as unknown as Vec3);
        hit.point.addScaledVector(hit.normal, 0.009);
        return hit.point.toArray() as [number, number, number];
      });
      k.sweep(bone, points, [0.012, 0.017, 0.012], undefined, undefined, 'cloth', 12);
    }
  }
}
function skull(k: SculptKit, p: Vec3 = [0, 0.22, 0], scale = 1): void {
  const shell = k.loft(
    bone,
    [
      [-0.24, 0, 0],
      [-0.22, 0.13, 0.1],
      [-0.14, 0.18, 0.15],
      [-0.06, 0.27, 0.22],
      [0.1, 0.3, 0.25],
      [0.25, 0.22, 0.19],
      [0.3, 0, 0],
    ],
    p,
  );
  shell.scale.setScalar(scale);
  for (const side of [-1, 1]) {
    k.sphere(
      ink,
      [side * 0.11 * scale, p[1] + 0.04 * scale, p[2] - 0.258 * scale],
      [0.085 * scale, 0.095 * scale, 0.013],
      undefined,
      16,
    );
    k.surfaceEye([side * 0.11 * scale, p[1] + 0.035 * scale, p[2] - 0.275 * scale], 0.45 * scale, undefined, 0xa591c8);
  }
  for (const x of [-0.065, 0, 0.065]) {
    const hit = k.surfacePoint([x * scale, p[1] - 0.165 * scale, p[2] - 0.2]);
    const seam = k.box(
      ink,
      [hit.point.x, hit.point.y, hit.point.z - 0.004],
      [0.011, 0.044 * scale, 0.006],
      undefined,
      0.003,
    );
    seam.userData.facialDetail = true;
  }
}
const builders: Record<string, (k: SculptKit, c: number) => void> = {
  bookGhost(k, c) {
    k.box(c, [0, 0.03, 0.015], [0.65, 0.76, 0.25], undefined, 0.055, 'leather');
    k.box(cream, [0.025, 0.03, -0.116], [0.55, 0.65, 0.09], undefined, 0.025);
    k.box(0x754b45, [-0.28, 0.03, -0.045], [0.13, 0.77, 0.29], undefined, 0.045, 'leather');
    for (const y of [-0.24, -0.19, 0.23, 0.28])
      k.box(gold, [-0.29, y, -0.2], [0.1, 0.022, 0.012], undefined, 0.005, 'metal');
    for (const side of [-1, 1])
      petal(
        k,
        0xa9dcd6,
        [
          [side * 0.28, -0.02, 0],
          [side * 0.45, -0.06, -0.04],
          [side * 0.48, 0.08, -0.08],
        ],
        0.06,
        0.035,
      );
    k.sweep(
      0xa9dcd6,
      [
        [0, -0.29, 0.04],
        [0, -0.47, 0.02],
        [0.14, -0.51, -0.02],
        [0.22, -0.44, -0.02],
      ],
      [0.12, 0.085, 0.04, 0],
    );
    k.surfaceFace(0.12, -0.168, 0.13, 0.95);
    k.box(0xb67999, [0.17, -0.28, -0.18], [0.075, 0.28, 0.014], undefined, 0.015);
    for (let i = 0; i < 4; i++)
      k.tube(
        0xd8c7a8,
        [
          [0.01, -0.05 - i * 0.045, -0.166],
          [0.23, -0.05 - i * 0.045, -0.166],
        ],
        0.004,
      );
  },
  pencilGhost(k, c) {
    k.cylinder(c, [0, 0.02, 0], 0.145, 0.145, 0.62, undefined, 6);
    k.loft(
      pink,
      [
        [0.32, 0.145, 0.145],
        [0.43, 0.14, 0.14],
        [0.49, 0.09, 0.09],
        [0.51, 0, 0],
      ],
      undefined,
      undefined,
      'cloth',
      12,
    );
    k.cylinder(0xafc5ce, [0, 0.3, 0], 0.153, 0.153, 0.09, undefined, 20, 'metal');
    k.loft(
      cream,
      [
        [-0.52, 0, 0],
        [-0.43, 0.06, 0.06],
        [-0.29, 0.145, 0.145],
      ],
      undefined,
      undefined,
      'cloth',
      10,
      12,
    );
    k.loft(
      ink,
      [
        [-0.56, 0, 0],
        [-0.49, 0.04, 0.04],
        [-0.46, 0.03, 0.03],
      ],
      undefined,
      undefined,
      'cloth',
      8,
      12,
    );
    k.surfaceFace(0.08, -0.148, 0.074, 0.65);
    for (const side of [-1, 1]) limb(k, 0x9fd5d0, side, -0.03);
  },
  paperGhost(k) {
    // A folded paper manta: curved wings with a clear nose and raised central crease.
    for (const side of [-1, 1]) {
      const s = new THREE.Shape();
      s.moveTo(0, -0.46);
      s.bezierCurveTo(side * 0.18, -0.16, side * 0.55, 0.14, side * 0.65, 0.35);
      s.quadraticCurveTo(side * 0.32, 0.25, side * 0.08, 0.27);
      s.closePath();
      const wing = k.shape(cream, s, 0.018, [0, 0, 0]);
      wing.rotation.x = Math.PI / 2;
      wing.rotation.y = side * 0.08;
      k.tube(
        0xb8cbd1,
        [
          [0, 0.005, -0.45],
          [side * 0.12, 0.025, 0.04],
          [side * 0.57, 0.045, 0.31],
        ],
        0.007,
      );
    }
    k.sweep(
      0xc7d9df,
      [
        [0, 0.01, -0.45],
        [0, -0.07, 0.02],
        [0, -0.1, 0.29],
      ],
      [0, 0.055, 0],
      [0, 0.14, 0],
    );
    for (const side of [-1, 1]) {
      k.sphere(ink, [side * 0.075, 0.026, -0.16], [0.038, 0.008, 0.051], undefined, 12, 'eye');
      k.sphere(cream, [side * 0.075 - 0.01, 0.035, -0.174], [0.009, 0.004, 0.012], undefined, 8, 'eye');
    }
  },
  zombie(k, c) {
    k.loft(0x7c668c, pear);
    head(k, c, [0, 0.23, -0.015], 1.1);
    feet(k, 0x51435c);
    for (const side of [-1, 1]) limb(k, c, side, -0.02);
    k.surfaceFace(0.28, -0.278, 0.135, 0.95);
    patch(k, [-0.16, 0.4, -0.26], 0xb8c797);
    patch(k, [0.11, -0.22, -0.22], 0xc5a58a);
    k.sweep(
      0x494251,
      [
        [-0.19, 0.44, -0.02],
        [-0.08, 0.53, -0.03],
        [0.1, 0.49, -0.03],
      ],
      [0, 0.055, 0],
      [0, 0.025, 0],
    );
  },
  zombieDog(k, c) {
    canine(k, c, true);
  },
  crow(k) {
    bird(k, 0x45405c);
  },
  wireGolem(k, c) {
    k.loft(
      c,
      [
        [-0.34, 0, 0],
        [-0.3, 0.22, 0.18],
        [-0.06, 0.27, 0.22],
        [0.19, 0.27, 0.21],
        [0.31, 0.19, 0.17],
        [0.35, 0, 0],
      ],
      undefined,
      undefined,
      'metal',
    );
    k.box(ink, [0, 0.13, -0.205], [0.37, 0.16, 0.04], undefined, 0.055);
    for (const side of [-1, 1]) {
      k.surfaceEye([side * 0.095, 0.13, -0.232], 0.63, undefined, 0x91dfd4);
      for (let cable = 0; cable < 3; cable++)
        k.sweep(
          cable === 1 ? 0xc3a879 : 0x597785,
          [
            [side * 0.2, 0.15, 0.025 + (cable - 1) * 0.035],
            [side * 0.33, 0.01, 0.01 + (cable - 1) * 0.035],
            [side * 0.35, -0.17, -0.065 + (cable - 1) * 0.035],
            [side * 0.3, -0.24, -0.1 + (cable - 1) * 0.035],
          ],
          [0.025, 0.026, 0.023, 0],
          undefined,
          undefined,
          'metal',
          16,
        );
    }
    feet(k, 0x465b70);
    k.torus(gold, [0, -0.11, -0.222], 0.087, 0.012, undefined, 'metal');
    k.sweep(
      0xa9dbd3,
      [
        [-0.14, 0.31, 0],
        [-0.14, 0.46, 0],
        [0.13, 0.46, 0],
        [0.14, 0.31, 0],
      ],
      [0.024, 0.024, 0.024, 0.024],
      undefined,
      undefined,
      'metal',
    );
  },
  sparkBot(k, c) {
    k.loft(
      c,
      [
        [-0.38, 0, 0],
        [-0.31, 0.19, 0.18],
        [-0.12, 0.32, 0.27],
        [0.16, 0.31, 0.27],
        [0.31, 0.2, 0.18],
        [0.35, 0, 0],
      ],
      undefined,
      undefined,
      'metal',
    );
    k.box(ink, [0, 0.08, -0.26], [0.43, 0.18, 0.045], undefined, 0.06);
    for (const side of [-1, 1]) k.surfaceEye([side * 0.105, 0.09, -0.293], 0.7, undefined, 0xb4f3df);
    for (const side of [-1, 1]) {
      k.sweep(
        gold,
        [
          [side * 0.22, 0.23, 0],
          [side * 0.32, 0.37, 0],
          [side * 0.26, 0.49, 0],
        ],
        [0.025, 0.025, 0.015],
        undefined,
        undefined,
        'metal',
      );
      k.sphere(0xb3e9dd, [side * 0.26, 0.49, 0], [0.04, 0.05, 0.04], undefined, 12, 'glow');
    }
    k.torus(gold, [0, -0.18, -0.235], 0.065, 0.018, undefined, 'metal');
  },
  drone(k, c) {
    k.loft(
      c,
      [
        [-0.2, 0, 0],
        [-0.16, 0.21, 0.22],
        [0, 0.31, 0.28],
        [0.16, 0.24, 0.22],
        [0.21, 0, 0],
      ],
      undefined,
      undefined,
      'metal',
    );
    k.surfaceFace(0.02, -0.283, 0.105, 0.72);
    for (const side of [-1, 1]) {
      k.sweep(
        0x5c7287,
        [
          [side * 0.2, 0.04, 0.03],
          [side * 0.39, 0.07, 0.02],
          [side * 0.48, 0.09, 0],
        ],
        [0.045, 0.035, 0.025],
        undefined,
        undefined,
        'metal',
        12,
      );
      k.torus(0x5c7287, [side * 0.46, 0.1, 0], 0.2, 0.022, undefined, 'metal').rotation.x = Math.PI / 2;
      for (const a of [0, Math.PI / 2]) {
        const p = k.box(0xc9dfd9, [side * 0.46, 0.12, 0], [0.34, 0.018, 0.045], undefined, 0.018, 'metal');
        p.rotation.y = a;
      }
      k.sweep(
        gold,
        [
          [side * 0.16, -0.1, 0.08],
          [side * 0.23, -0.25, 0.08],
          [side * 0.23, -0.25, -0.13],
        ],
        [0.018, 0.018, 0.018],
        undefined,
        undefined,
        'metal',
        12,
      );
    }
  },
  pufferfish(k, c) {
    k.loft(c, [
      [-0.36, 0, 0],
      [-0.3, 0.22, 0.24],
      [-0.07, 0.36, 0.34],
      [0.18, 0.33, 0.32],
      [0.34, 0.22, 0.22],
      [0.39, 0, 0],
    ]);
    k.surfaceFace(0.1, -0.335, 0.14, 1);
    k.torus(0xd99071, [0, -0.08, -0.339], 0.037, 0.012);
    for (const side of [-1, 1])
      petal(
        k,
        gold,
        [
          [side * 0.29, -0.03, 0.02],
          [side * 0.46, 0.025, 0.02],
          [side * 0.51, -0.09, 0.025],
        ],
        0.11,
        0.025,
      );
    petal(
      k,
      gold,
      [
        [0, -0.02, 0.27],
        [0, 0.02, 0.48],
        [0, 0.02, 0.58],
      ],
      0.13,
      0.025,
    );
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI * 2) / 10;
      if (Math.cos(a) < -0.4) continue;
      k.sweep(
        cream,
        [
          [Math.sin(a) * 0.29, 0.13, Math.cos(a) * 0.29],
          [Math.sin(a) * 0.39, 0.18, Math.cos(a) * 0.39],
        ],
        [0.035, 0],
        undefined,
        undefined,
        'cloth',
        8,
      );
    }
  },
  sharkFin(k, c) {
    const body = k.loft(
      c,
      [
        [-0.78, 0, 0],
        [-0.7, 0.13, 0.095],
        [-0.53, 0.22, 0.18],
        [-0.23, 0.23, 0.21],
        [0.07, 0.18, 0.17],
        [0.38, 0.1, 0.105],
        [0.68, 0.035, 0.055],
        [0.75, 0, 0],
      ],
      undefined,
      undefined,
      'cloth',
      24,
      20,
    );
    body.rotation.x = Math.PI / 2;
    const positions = body.geometry.getAttribute('position'),
      colors: number[] = [];
    for (let i = 0; i < positions.count; i++) {
      const col = new THREE.Color(positions.getZ(i) > 0.055 ? 0xd9e3df : c);
      colors.push(col.r, col.g, col.b);
    }
    body.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mat = k.material(c).clone();
    mat.color.setHex(0xffffff);
    mat.vertexColors = true;
    body.material = mat;
    for (const side of [-1, 1]) {
      k.surfaceEye([side * 0.15, 0.085, -0.59], 0.86);
      const fin = new THREE.Shape();
      fin.moveTo(side * 0.15, -0.05);
      fin.quadraticCurveTo(side * 0.4, 0.03, side * 0.58, 0.3);
      fin.quadraticCurveTo(side * 0.31, 0.28, side * 0.13, 0.14);
      fin.closePath();
      const mesh = k.shape(c, fin, 0.023, [0, -0.08, -0.1]);
      mesh.rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++)
        k.sweep(
          0x536f85,
          [
            [side * 0.213, 0.035, -0.28 + i * 0.065],
            [side * 0.216, -0.035, -0.27 + i * 0.065],
            [side * 0.193, -0.09, -0.25 + i * 0.065],
          ],
          [0.005, 0.007, 0],
          undefined,
          undefined,
          'cloth',
          8,
        );
    }
    const dorsal = new THREE.Shape();
    dorsal.moveTo(-0.21, 0);
    dorsal.bezierCurveTo(-0.12, 0.14, -0.13, 0.34, -0.1, 0.39);
    dorsal.quadraticCurveTo(0.03, 0.22, 0.28, 0);
    dorsal.closePath();
    k.shape(c, dorsal, 0.03, [0, 0.17, 0.02]).rotation.y = -Math.PI / 2;
    const tail = new THREE.Shape();
    tail.moveTo(-0.07, 0);
    tail.quadraticCurveTo(0.06, 0.15, 0.18, 0.34);
    tail.quadraticCurveTo(0.19, 0.13, 0.08, 0);
    tail.quadraticCurveTo(0.22, -0.12, 0.15, -0.29);
    tail.quadraticCurveTo(0.025, -0.12, -0.07, 0);
    tail.closePath();
    k.shape(c, tail, 0.027, [0, 0, 0.7]).rotation.y = -Math.PI / 2;
    const smile: Vec3[] = [
      [-0.095, -0.085, 0],
      [0, -0.115, 0],
      [0.095, -0.085, 0],
    ].map((p) => {
      const h = k.surfacePoint([p[0], p[1], p[2]]);
      h.point.addScaledVector(h.normal, 0.004);
      return h.point.toArray() as Vec3;
    });
    k.sweep(ink, smile, [0, 0.009, 0]);
  },
  jellyfish(k, c) {
    k.loft(
      c,
      [
        [0, 0, 0],
        [0.015, 0.31, 0.31],
        [0.08, 0.37, 0.35],
        [0.27, 0.29, 0.28],
        [0.42, 0.14, 0.14],
        [0.45, 0, 0],
      ],
      undefined,
      undefined,
      'cloth',
      24,
    );
    k.surfaceFace(0.21, -0.303, 0.13, 0.8);
    for (let i = 0; i < 7; i++) {
      const a = (i * Math.PI * 2) / 7,
        x = Math.sin(a) * 0.23,
        z = Math.cos(a) * 0.23;
      k.sweep(
        i % 2 ? 0xc8b9e7 : 0xf1c1d6,
        [
          [x, 0.03, z],
          [x * 1.05, -0.16, z],
          [x * 0.6 + 0.06, -0.34, z + 0.02],
          [x + 0.07, -0.46, z],
        ],
        [0.035, 0.029, 0.022, 0],
      );
    }
  },
  ghoul(k, c) {
    k.loft(0x686080, pear);
    head(k, c, [0, 0.2, -0.09], 0.88);
    k.surfaceFace(0.24, -0.31, 0.12, 0.85);
    for (const side of [-1, 1]) {
      limb(k, 0x686080, side);
      k.sweep(
        cream,
        [
          [side * 0.06, 0.07, -0.3],
          [side * 0.06, 0.025, -0.3],
        ],
        [0.021, 0],
        undefined,
        undefined,
        'cloth',
        8,
      );
    }
    k.sweep(
      0x686080,
      [
        [0, -0.31, 0.03],
        [0.02, -0.48, 0.06],
        [0.19, -0.5, 0.04],
      ],
      [0.18, 0.09, 0],
    );
    patch(k, [0.08, -0.2, -0.22], 0xa79691);
  },
  wolf(k, c) {
    canine(k, c, false);
  },
  bat(k) {
    k.loft(0x746080, pear).scale.set(0.7, 0.8, 0.75);
    ears(k, 0x746080, 0.13, 0.27, -0.03);
    k.surfaceFace(0.18, -0.197, 0.09, 0.75);
    for (const side of [-1, 1]) {
      const w = new THREE.Shape();
      w.moveTo(side * 0.13, 0.1);
      w.bezierCurveTo(side * 0.37, 0.35, side * 0.56, 0.36, side * 0.74, 0.2);
      w.quadraticCurveTo(side * 0.72, 0.04, side * 0.69, -0.12);
      w.quadraticCurveTo(side * 0.51, 0.06, side * 0.47, -0.23);
      w.quadraticCurveTo(side * 0.3, -0.05, side * 0.22, -0.23);
      w.quadraticCurveTo(side * 0.18, -0.03, side * 0.13, 0.1);
      k.shape(0xa284ac, w, 0.025, [0, 0, 0.04]);
      k.sweep(
        0x746080,
        [
          [side * 0.12, 0.1, 0.02],
          [side * 0.36, 0.29, 0.02],
          [side * 0.57, 0.3, 0.02],
          [side * 0.73, 0.2, 0.02],
        ],
        [0.025, 0.024, 0.019, 0],
      );
      k.sweep(
        cream,
        [
          [side * 0.043, 0.045, -0.2],
          [side * 0.043, -0.015, -0.2],
        ],
        [0.018, 0],
        undefined,
        undefined,
        'cloth',
        8,
      );
    }
  },
  boneGolem(k) {
    // Open broad skeletal frame: negative space between ribs, not painted stripes on a bean.
    k.sweep(
      0xaaa0ac,
      [
        [0, -0.33, 0.06],
        [0, -0.07, 0.07],
        [0, 0.18, 0.04],
      ],
      [0.065, 0.07, 0.06],
      undefined,
      undefined,
      'cloth',
      12,
    );
    for (const side of [-1, 1])
      k.sweep(
        bone,
        [
          [0, 0.1, 0.025],
          [side * 0.17, 0.16, 0.035],
          [side * 0.28, 0.1, 0.025],
        ],
        [0.045, 0.055, 0.035],
        undefined,
        undefined,
        'cloth',
        12,
      );
    skull(k, [0, 0.25, -0.01], 1.05);
    feet(k, bone);
    for (const side of [-1, 1]) limb(k, bone, side, -0.02);
    for (const y of [-0.035, -0.14, -0.24])
      for (const side of [-1, 1])
        k.sweep(
          bone,
          [
            [0, y, 0.06],
            [side * 0.17, y + 0.025, 0.05],
            [side * 0.25, y, -0.06],
            [side * 0.18, y - 0.04, -0.17],
            [0, y - 0.065, -0.19],
          ],
          [0.024, 0.035, 0.037, 0.03, 0.022],
          undefined,
          undefined,
          'cloth',
          16,
        );
  },
  skeletonSoldier(k) {
    skull(k, [0, 0.25, 0], 0.92);
    k.sweep(
      bone,
      [
        [0, 0.03, 0],
        [0, -0.29, 0],
      ],
      [0.045, 0.045],
      undefined,
      undefined,
      'cloth',
      8,
    );
    for (const side of [-1, 1]) {
      limb(k, bone, side, -0.03);
      k.sweep(
        bone,
        [
          [side * 0.12, -0.23, 0],
          [side * 0.13, -0.42, -0.04],
          [side * 0.13, -0.45, -0.14],
        ],
        [0.045, 0.04, 0],
        undefined,
        undefined,
        'cloth',
        12,
      );
    }
    for (const y of [-0.06, -0.16])
      k.sweep(
        bone,
        [
          [-0.16, y, 0],
          [0, y - 0.025, -0.13],
          [0.16, y, 0],
        ],
        [0.019, 0.025, 0.019],
        undefined,
        undefined,
        'cloth',
        12,
      );
    k.loft(
      0x8695a9,
      [
        [0.44, 0.285, 0.24],
        [0.53, 0.24, 0.205],
        [0.62, 0, 0],
      ],
      undefined,
      undefined,
      'metal',
      10,
    );
    k.sweep(
      0xc2d1d4,
      [
        [0.32, -0.22, -0.13],
        [0.32, 0.22, -0.13],
        [0.32, 0.3, -0.13],
      ],
      [0.027, 0.027, 0],
      [0.018, 0.018, 0],
      undefined,
      'metal',
      12,
    );
    k.box(gold, [0.32, -0.16, -0.13], [0.16, 0.025, 0.05], undefined, 0.01, 'metal');
  },
  skullBird(k) {
    bird(k, 0x82778e, true);
  },
};
export function createMonsterModel(def: Pick<MonsterDef, 'id' | 'color'>): THREE.Group {
  const key = `${def.id}:${def.color}`;
  let template = templates.get(key);
  if (!template) {
    const build = builders[def.id];
    if (!build) throw new Error(`Unknown monster model: ${def.id}`);
    const k = new MonsterKit();
    k.group.name = def.id;
    build(k, def.color);
    template = bakeStaticModel(k.group);
    templates.set(key, template);
  }
  return template.clone(true);
}
