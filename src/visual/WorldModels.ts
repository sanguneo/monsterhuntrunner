import * as THREE from 'three';
import { ModelKit, bakeStaticModel, type Vec3 } from './ModelKit';
import { sweepGeometry } from './SculptKit';
import { WORLDS, type WorldTheme } from '../data/worlds';

// Each side is authored in elevation: X follows the corridor, -Z faces the lane.
// Long planar mouldings stay inexpensive; silhouettes spend vertices on actual curves.
const INK = 0x192034,
  IVORY = 0xcabfa7,
  BRASS = 0xb49460;
type Author = (k: ModelKit, w: THREE.Group, t: WorldTheme) => void;
function block(k: ModelKit, w: THREE.Group, c: number, p: Vec3, s: Vec3, bevel = 0): THREE.Mesh {
  return k.box(c, p, s, w, bevel);
}
function curve(
  k: ModelKit,
  w: THREE.Group,
  c: number,
  p: readonly Vec3[],
  r: number,
  steps = 12,
  sides = 6,
): THREE.Mesh {
  return k.mesh(sweepGeometry(p, [r, r], undefined, steps, sides), c, [0, 0, 0], [1, 1, 1], w);
}
function arch(width: number, height: number): THREE.Shape {
  const s = new THREE.Shape(),
    r = width / 2;
  s.moveTo(-r, 0);
  s.lineTo(r, 0);
  s.lineTo(r, height - r);
  s.bezierCurveTo(r, height - r * 0.43, r * 0.55, height, 0, height);
  s.bezierCurveTo(-r * 0.55, height, -r, height - r * 0.43, -r, height - r);
  s.closePath();
  return s;
}
function gothic(width: number, height: number): THREE.Shape {
  const s = new THREE.Shape(),
    r = width / 2;
  s.moveTo(-r, 0);
  s.lineTo(r, 0);
  s.lineTo(r, height * 0.59);
  s.bezierCurveTo(r, height * 0.8, r * 0.4, height * 0.97, 0, height);
  s.bezierCurveTo(-r * 0.4, height * 0.97, -r, height * 0.8, -r, height * 0.59);
  s.closePath();
  return s;
}
function panel(k: ModelKit, w: THREE.Group, c: number, s: THREE.Shape, p: Vec3, depth = 0.08): THREE.Mesh {
  return k.mesh(
    new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 8, steps: 1 }),
    c,
    p,
    [1, 1, 1],
    w,
  );
}
function framed(
  k: ModelKit,
  w: THREE.Group,
  c: number,
  inner: number,
  x: number,
  y: number,
  width: number,
  height: number,
  pointed = false,
): void {
  const shape = (pointed ? gothic : arch)(width, height);
  panel(k, w, c, shape, [x, y, -0.22], 0.12);
  const pane = panel(k, w, inner, (pointed ? gothic : arch)(width - 0.2, height - 0.2), [x, y + 0.1, -0.25], 0.025);
  pane.material = k.material(inner, 'glow');
}
function lantern(k: ModelKit, w: THREE.Group, x: number, y: number, c = 0xffd394): void {
  block(k, w, BRASS, [x, y, -0.55], [0.32, 0.56, 0.28], 0.025);
  k.box(c, [x, y, -0.71], [0.2, 0.38, 0.02], w, 0, 'glow');
  block(k, w, INK, [x, y + 0.32, -0.55], [0.43, 0.08, 0.34]);
  block(k, w, INK, [x, y - 0.32, -0.55], [0.38, 0.07, 0.32]);
}
const school: Author = (k, w, t) => {
  block(k, w, t.wallA, [0, 3.15, 0.2], [16, 6.3, 0.4]);
  block(k, w, t.wallB, [0, 0.8, -0.07], [16, 1.6, 0.18]);
  for (const y of [0.1, 1.65, 5.95]) block(k, w, IVORY, [0, y, -0.2], [16, 0.07, 0.13]);
  for (const x of [-5.4, 5.4]) {
    framed(k, w, IVORY, 0x3d5689, x, 2.05, 2.8, 3.55);
    block(k, w, IVORY, [x, 3.55, -0.31], [0.075, 2.9, 0.07]);
    block(k, w, IVORY, [x, 3.3, -0.31], [2.63, 0.075, 0.07]);
    // Pane night-sky disc and horizon are deliberately flat inlays, not glowing room props.
    k.mesh(new THREE.CircleGeometry(0.28, 16), 0xd4d8ba, [x + 0.57, 4.75, -0.32], [1, 1, 1], w).rotation.y = Math.PI;
    for (let i = 0; i < 3; i++)
      block(k, w, 0x253654, [x - 0.8 + i * 0.8, 2.4, -0.32], [0.78, 0.45 + (i % 2) * 0.2, 0.02]);
  }
  for (let i = 0; i < 4; i++) {
    const x = -2.9 + i * 0.73;
    block(k, w, INK, [x, 1.73, -0.3], [0.71, 3.24, 0.45]);
    block(k, w, 0x71828d, [x, 1.75, -0.55], [0.65, 3.08, 0.07], 0.025);
    for (const y of [0.55, 0.65, 2.75, 2.85]) block(k, w, INK, [x, y, -0.6], [0.39, 0.025, 0.018]);
    block(k, w, BRASS, [x + 0.2, 1.6, -0.62], [0.045, 0.21, 0.05]);
    block(k, w, IVORY, [x, 2.35, -0.6], [0.2, 0.11, 0.012]);
  }
  framed(k, w, IVORY, INK, 2.1, 0.08, 2.1, 4.25);
  block(k, w, 0x77697f, [2.1, 1.97, -0.36], [1.83, 3.72, 0.08]);
  block(k, w, 0x3d5689, [2.1, 2.8, -0.42], [1.15, 1.05, 0.03]);
  block(k, w, BRASS, [2.75, 1.75, -0.46], [0.08, 0.12, 0.08]);
  for (const x of [-3.8, 3.7]) lantern(k, w, x, 4.75);
  block(k, w, BRASS, [0.35, 4.75, -0.29], [1.4, 0.54, 0.1], 0.03);
  block(k, w, INK, [0.35, 4.75, -0.36], [1.24, 0.4, 0.03]);
  for (const y of [4.67, 4.82]) block(k, w, IVORY, [0.35, y, -0.38], [0.82, 0.025, 0.015]);
};
const village: Author = (k, w, t) => {
  for (const x of [-4.25, 4.1]) {
    block(k, w, t.wallA, [x, 1.8, 0.55], [6.7, 3.6, 1.1]);
    const roof = new THREE.Shape();
    roof.moveTo(-3.6, 0);
    roof.quadraticCurveTo(-1.6, 1.45, 0, 2.3);
    roof.quadraticCurveTo(1.7, 1.35, 3.55, 0.05);
    roof.lineTo(3.3, -0.18);
    roof.quadraticCurveTo(1.6, 0.9, 0, 1.9);
    roof.quadraticCurveTo(-1.6, 1, -3.4, -0.2);
    roof.closePath();
    panel(k, w, t.wallB, roof, [x, 3.5, -0.12], 1.4);
    for (const dx of [-2.7, 2.7]) block(k, w, 0x65594e, [x + dx, 1.8, -0.06], [0.15, 3.6, 0.2]);
    for (const dx of [-1.65, 1.65]) {
      framed(k, w, 0x65594e, INK, x + dx, 1.5, 1.5, 1.8);
      const plank = block(k, w, IVORY, [x + dx, 2.3, -0.34], [1.72, 0.17, 0.1]);
      plank.rotation.z = dx * 0.16;
    }
    panel(k, w, INK, arch(1.25, 2.7), [x, 0.03, -0.13]);
    block(k, w, 0x65594e, [x, 1.32, -0.24], [1.03, 2.62, 0.12]);
    block(k, w, BRASS, [x + 0.33, 1.2, -0.32], [0.07, 0.09, 0.04]);
    block(k, w, t.wallB, [x + 1.2, 5.0, 0.6], [0.65, 1.2, 0.7]);
  }
  for (const x of [-1.1, -0.55, 0, 0.55, 1.1]) {
    const p = block(k, w, 0x65594e, [x, 0.65, -0.65], [0.26, 1.3, 0.15]);
    p.rotation.z = x * 0.08;
  }
  for (const y of [0.35, 0.95]) block(k, w, IVORY, [0, y, -0.76], [2.65, 0.1, 0.1]);
  // One tapered bent tree silhouette, continuous branches instead of stacked spheres.
  curve(
    k,
    w,
    0x65594e,
    [
      [6.9, 0, -0.8],
      [6.75, 1.7, -0.72],
      [7.05, 3.1, -0.6],
      [6.85, 4.3, -0.5],
    ],
    0.12,
    16,
    7,
  );
  curve(
    k,
    w,
    0x65594e,
    [
      [6.8, 1.6, -0.7],
      [6.05, 2.3, -0.65],
      [5.8, 3.0, -0.6],
    ],
    0.06,
    10,
    6,
  );
  curve(
    k,
    w,
    0x65594e,
    [
      [7, 2.9, -0.6],
      [7.7, 3.4, -0.55],
      [7.75, 4, -0.5],
    ],
    0.055,
    10,
    6,
  );
  lantern(k, w, -0.2, 3.3, 0xd7dfa0);
};
const laboratory: Author = (k, w, t) => {
  block(k, w, t.wallA, [0, 3.1, 0.2], [16, 6.2, 0.4]);
  for (const x of [-6, -2, 2, 6]) {
    block(k, w, t.wallB, [x, 2.7, -0.1], [3.85, 5.3, 0.22], 0.045);
    for (const y of [0.25, 5.4]) block(k, w, 0x758c9a, [x, y, -0.26], [3.7, 0.09, 0.1]);
  }
  for (const x of [-7.9, 0, 7.9]) block(k, w, 0x758c9a, [x, 3.1, -0.3], [0.15, 6.2, 0.18]);
  curve(
    k,
    w,
    0x758c9a,
    [
      [-8, 4.9, -0.44],
      [-3, 4.9, -0.44],
      [-2.5, 4.3, -0.44],
      [3, 4.3, -0.44],
      [3.5, 4.9, -0.44],
      [8, 4.9, -0.44],
    ],
    0.085,
    26,
    7,
  );
  for (const x of [-5.4, 5.4]) {
    k.cylinder(0x758c9a, [x, 0.3, -0.7], 0.52, 0.58, 0.5, w, 12, 'metal');
    k.cylinder(t.wallB, [x, 1.65, -0.7], 0.2, 0.27, 2.3, w, 10, 'metal');
    for (const y of [0.8, 1.2, 1.6, 2, 2.4]) {
      const ring = k.mesh(new THREE.TorusGeometry(0.39, 0.045, 4, 16), 0x758c9a, [x, y, -0.7], [1, 1, 1], w, 'metal');
      ring.rotation.x = Math.PI / 2;
    }
    k.mesh(new THREE.SphereGeometry(1, 12, 8), 0x9bdcd4, [x, 2.85, -0.7], [0.44, 0.26, 0.44], w, 'metal');
    k.box(0x76d7d5, [x, 3.65, -0.35], [1.4, 0.13, 0.08], w, 0.035, 'glow');
  }
  block(k, w, INK, [0, 2.1, -0.52], [3.4, 2.8, 0.55], 0.045);
  block(k, w, 0x375e70, [0, 2.55, -0.82], [2.9, 1.5, 0.045]);
  for (const x of [-0.9, 0, 0.9]) {
    const g = k.mesh(new THREE.CircleGeometry(0.28, 16), IVORY, [x, 2.65, -0.85], [1, 1, 1], w);
    g.rotation.y = Math.PI;
    const needle = block(k, w, INK, [x, 2.65, -0.87], [0.025, 0.36, 0.015]);
    needle.rotation.z = 0.45 + x * 0.3;
    k.box(0x76d7d5, [x, 1.35, -0.85], [0.26, 0.09, 0.04], w, 0.025, 'glow');
  }
  for (const y of [1.68, 1.81]) block(k, w, 0x758c9a, [0, y, -0.85], [2.6, 0.025, 0.015]);
};
// Sculpted ribbons form the cave's continuous surface. No pile of ellipsoid rocks.
function caveRibbon(k: ModelKit, w: THREE.Group, c: number, offset: number): void {
  const pos: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  const nx = 16,
    ny = 8;
  for (let j = 0; j <= ny; j++)
    for (let i = 0; i <= nx; i++) {
      const x = -8 + (i / nx) * 16,
        y = (j / ny) * 6.5;
      const z =
        0.2 +
        offset +
        Math.sin((x * Math.PI) / 8 + 0.6 + Math.sin(y * 0.5) * 0.25) * 0.45 +
        Math.sin(y * 0.62) * 0.5 +
        (y / 6.5) ** 3 * 0.7;
      pos.push(x, y, z);
      uv.push(i / nx, j / ny);
      if (j < ny && i < nx) {
        const a = j * (nx + 1) + i,
          b = a + nx + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const normals = g.getAttribute('normal');
  for (let row = 0; row <= ny; row++) {
    const a = row * (nx + 1),
      b = a + nx;
    const n = new THREE.Vector3(
      normals.getX(a) + normals.getX(b),
      normals.getY(a) + normals.getY(b),
      normals.getZ(a) + normals.getZ(b),
    ).normalize();
    normals.setXYZ(a, n.x, n.y, n.z);
    normals.setXYZ(b, n.x, n.y, n.z);
  }
  k.mesh(g, c, [0, 0, 0], [1, 1, 1], w);
}
function coralCurve(
  k: ModelKit,
  w: THREE.Group,
  c: number,
  p: readonly Vec3[],
  r: number,
  steps = 12,
  sides = 6,
): void {
  k.mesh(sweepGeometry(p, [r, r * 0.95, r * 0.7, 0], undefined, steps, sides), c, [0, 0, 0], [1, 1, 1], w);
}
const sea: Author = (k, w, t) => {
  caveRibbon(k, w, t.wallA, 0);
  for (const [x, c] of [
    [-5.1, 0xc489ad],
    [1.4, 0x7ebeb8],
    [6.6, 0xc489ad],
  ] as const) {
    coralCurve(
      k,
      w,
      c,
      [
        [x, 0.02, -0.8],
        [x + 0.05, 0.7, -0.84],
        [x - 0.1, 1.45, -0.8],
        [x + 0.1, 2.0, -0.73],
      ],
      0.095,
      12,
      6,
    );
    for (const side of [-1, 1]) {
      coralCurve(
        k,
        w,
        c,
        [
          [x, 0.55, -0.82],
          [x + side * 0.4, 0.95, -0.84],
          [x + side * 0.5, 1.45, -0.8],
        ],
        0.065,
        8,
        5,
      );
      coralCurve(
        k,
        w,
        c,
        [
          [x, 1.15, -0.8],
          [x + side * 0.27, 1.5, -0.76],
          [x + side * 0.34, 1.8, -0.7],
        ],
        0.045,
        8,
        5,
      );
    }
  }
  for (let i = 0; i < 4; i++) {
    const x = -3.3 + (i % 2) * 0.4,
      y = 0.6 + i * 0.75;
    const ring = k.torus(0x9bd8df, [x, y, -0.48], 0.12 + i * 0.025, 0.012, w, 'glow');
    ring.rotation.y = 0.2;
  }
  // Pearl shell: two continuous fan profiles, recognizable even at runner distance.
  const shell = new THREE.Shape();
  shell.moveTo(-0.65, 0);
  shell.bezierCurveTo(-0.8, 0.65, -0.35, 1.05, 0, 1);
  shell.bezierCurveTo(0.35, 1.05, 0.8, 0.65, 0.65, 0);
  shell.quadraticCurveTo(0, -0.15, -0.65, 0);
  panel(k, w, 0xc489ad, shell, [4.6, 0.12, -0.8], 0.09);
  k.sphere(IVORY, [4.6, 0.48, -0.93], [0.24, 0.22, 0.2], w, 12, 'eye');
  for (const x of [-7, 0, 7]) {
    const shaft = block(k, w, 0x44788a, [x, 3.4, -0.12], [0.22, 5.7, 0.02]);
    shaft.rotation.z = 0.14;
  }
};
const castle: Author = (k, w, t) => {
  block(k, w, t.wallA, [0, 3.6, 0.25], [16, 7.2, 0.5]);
  for (const x of [-5.4, 0, 5.4]) {
    framed(k, w, 0x8b7a86, 0x6a4b89, x, 1.05, 3.45, 5.55, true);
    for (const dx of [-0.72, 0.72])
      panel(k, w, dx < 0 ? 0x866783 : 0x4e8190, gothic(1.15, 3.9), [x + dx, 1.27, -0.3], 0.025);
    block(k, w, BRASS, [x, 3.15, -0.35], [0.065, 3.55, 0.045]);
    block(k, w, BRASS, [x, 2.6, -0.35], [3.2, 0.065, 0.045]);
    const rosette = k.torus(BRASS, [x, 5.05, -0.35], 0.38, 0.025, w, 'metal');
    rosette.scale.y = 1.1;
  }
  for (const x of [-7.9, -2.7, 2.7, 7.9]) {
    block(k, w, t.wallB, [x, 3.25, -0.38], [0.24, 6.5, 0.35], 0.04);
    block(k, w, 0x8b7a86, [x, 0.17, -0.42], [0.62, 0.34, 0.55], 0.035);
  }
  for (const x of [-2.7, 2.7]) {
    curve(
      k,
      w,
      BRASS,
      [
        [x, 2, -0.45],
        [x, 2.5, -0.85],
        [x, 3, -0.88],
      ],
      0.035,
      10,
      6,
    );
    block(k, w, IVORY, [x, 3.15, -0.89], [0.13, 0.5, 0.13], 0.02);
    k.sphere(0xffcd8d, [x, 3.48, -0.89], [0.06, 0.14, 0.05], w, 10, 'glow');
  }
  block(k, w, BRASS, [0, 0.32, -0.25], [16, 0.06, 0.12]);
};
const skullKingdom: Author = (k, w, t) => {
  block(k, w, t.wallA, [0, 3.25, 0.3], [16, 6.5, 0.6]);
  for (let row = 0; row < 4; row++)
    for (let i = 0; i < 6; i++) {
      const x = -7 + i * 2.8 + (row % 2) * 0.65;
      block(k, w, t.wallB, [x, 0.7 + row * 1.4, -0.06], [2.65, 1.28, 0.18], i % 3 === 0 ? 0.03 : 0);
    }
  for (const x of [-5.6, 0, 5.6]) {
    // Continuous tall bone ribs taper toward a high shoulder, never crossing the lane.
    k.mesh(
      sweepGeometry(
        [
          [x, 0, -0.6],
          [x - 0.2, 1.8, -0.8],
          [x - 0.1, 4, -0.7],
          [x + 0.35, 5.8, -0.15],
        ],
        [0.2, 0.17, 0.13, 0.05],
        undefined,
        20,
        8,
      ),
      IVORY,
      [0, 0, 0],
      [1, 1, 1],
      w,
    );
    block(k, w, BRASS, [x, 0.19, -0.6], [0.65, 0.38, 0.64], 0.03);
  }
  // Royal skull medallion cut into a tablet; sockets are flat dark inlays.
  panel(k, w, 0x80718a, arch(2.4, 3.2), [2.8, 1.8, -0.28], 0.16);
  const skull = new THREE.Shape();
  skull.moveTo(-0.6, -0.3);
  skull.lineTo(-0.55, -0.65);
  skull.lineTo(0.55, -0.65);
  skull.lineTo(0.6, -0.3);
  skull.bezierCurveTo(1, 0.35, 0.55, 0.85, 0, 0.85);
  skull.bezierCurveTo(-0.55, 0.85, -1, 0.35, -0.6, -0.3);
  skull.closePath();
  panel(k, w, IVORY, skull, [2.8, 3.4, -0.48], 0.08);
  for (const dx of [-0.3, 0.3]) {
    const eye = k.mesh(new THREE.CircleGeometry(0.2, 12), INK, [2.8 + dx, 3.58, -0.5], [1, 1.2, 1], w);
    eye.rotation.y = Math.PI;
  }
  for (const dx of [-0.22, 0, 0.22]) block(k, w, INK, [2.8 + dx, 2.94, -0.5], [0.04, 0.25, 0.02]);
  for (const x of [-2.8, 7.2]) {
    k.cylinder(BRASS, [x, 1.6, -0.8], 0.29, 0.19, 0.25, w, 10, 'metal');
    curve(
      k,
      w,
      BRASS,
      [
        [x, 1, -0.25],
        [x, 1.35, -0.8],
        [x, 1.6, -0.8],
      ],
      0.055,
      8,
      6,
    );
    k.mesh(
      sweepGeometry(
        [
          [x, 1.7, -0.8],
          [x - 0.05, 2, -0.8],
          [x + 0.05, 2.3, -0.8],
        ],
        [0.15, 0.1, 0],
        undefined,
        12,
        8,
      ),
      0xc7a8ea,
      [0, 0, 0],
      [1, 1, 1],
      w,
      'glow',
    );
  }
};
const AUTHORS: readonly Author[] = [school, village, laboratory, sea, castle, skullKingdom];
const EDGES = [0x889dc9, 0x99a780, 0x75c9c5, 0x6aabbc, 0xb28c92, 0xad9dc6];
export function buildWorldTemplate(theme: WorldTheme, index: number): THREE.Group {
  const k = new ModelKit();
  k.group.name = `environment-${WORLDS[index].id}`;
  for (const side of [-1, 1]) {
    const wall = new THREE.Group();
    wall.position.x = side * 5.6;
    wall.rotation.y = (side * Math.PI) / 2;
    k.group.add(wall);
    AUTHORS[index](k, wall, theme);
    // A continuous curb establishes the readable playable boundary without a raised lane marking.
    block(k, k.group, theme.wallB, [side * 3.9, 0.065, 0], [0.18, 0.13, 16]);
    block(k, k.group, EDGES[index], [side * 3.78, 0.018, 0], [0.035, 0.018, 16]);
    for (let j = 0; j < 4; j++) {
      block(k, k.group, EDGES[index], [side, 0, -6 + j * 4], [0.035, 0.006, 0.8]);
      block(k, k.group, theme.wallB, [side * 3.45, -0.006, -6 + j * 4], [0.42, 0.012, index === 2 ? 1.15 : 0.045]);
    }
  }
  // Flat, low-contrast floor vocabulary follows each space without obscuring hazards.
  for (let i = 0; i < 4; i++) {
    const z = -6 + i * 4;
    block(k, k.group, theme.wallB, [0, -0.012, z - 2], [7.6, 0.01, 0.035]);
    if (index === 0) {
      const tile = k.mesh(new THREE.PlaneGeometry(3.7, 3.94), theme.wallB, [i % 2 ? -1.9 : 1.9, -0.018, z]);
      tile.rotation.x = -Math.PI / 2;
    } else if (index === 1) {
      for (const x of [-2.8, -0.95, 0.95, 2.8])
        block(k, k.group, theme.wallB, [x + (i % 2 ? 0.15 : -0.15), -0.013, z], [0.035, 0.008, 3.9]);
    } else if (index === 2) {
      for (const x of [-3.4, 3.4])
        for (const dz of [-0.3, 0.3]) block(k, k.group, theme.wallB, [x, -0.01, z + dz], [0.6, 0.008, 0.045]);
    } else if (index === 3) {
      for (const side of [-1, 1]) {
        const p: number[] = [],
          idx: number[] = [];
        for (let j = 0; j <= 12; j++) {
          const zz = z - 2 + j / 3,
            xx = side * (2.8 + Math.sin(zz * 0.6) * 0.22);
          p.push(xx - 0.015, -0.012, zz, xx + 0.015, -0.012, zz);
          if (j < 12) {
            const a = j * 2;
            idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
          }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
        g.setIndex(idx);
        g.computeVertexNormals();
        k.mesh(g, theme.wallB);
      }
    } else if (index === 5) {
      for (const x of [-2, 2]) block(k, k.group, theme.wallB, [x, -0.012, z], [0.035, 0.01, 3.9]);
    }
  }
  if (index === 4) {
    const carpet = k.mesh(new THREE.PlaneGeometry(1.82, 16), theme.wallB, [0, -0.017, 0]);
    carpet.rotation.x = -Math.PI / 2;
    for (const x of [-0.86, 0.86]) block(k, k.group, EDGES[index], [x, -0.009, 0], [0.025, 0.006, 16]);
  }
  return bakeStaticModel(k.group);
}
