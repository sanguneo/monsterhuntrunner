import { buildAuthoredDraculaFace } from './DraculaAuthoredFace';
import { dressCastleBeast } from './castleBeastMaterials';
import { dressDracula } from './castleMaterials';
import { bat, ghoul, werewolf } from './castleAdditional';
import * as THREE from 'three';
import { loftGeometry } from '../../SculptKit';
import type { Vec3 } from '../../ModelKit';
import { CastleKit, leaf, patch, tubeHand, branchedWolfCore, embeddedPredatorEye } from './castleForms';
const charcoal = 0x292a32,
  fur = 0x454650,
  silver = 0x8b8990,
  bone = 0xe4d8c5,
  red = 0x661d31,
  black = 0x161921,
  gold = 0xa68a58;

function wolfLeaf(k: CastleKit, c: number, a: Vec3, b: Vec3, t: Vec3, bulge: number, name: string): THREE.Mesh {
  if (name === 'swept-cheek-ruff' || name === 'spine-fur-layer') {
    const root: [number, number, number] = [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5];
    const cheek = name === 'swept-cheek-ruff';
    if (cheek) {
      root[0] *= 0.88;
      root[2] += 0.07;
      t = [t[0] * 1.05, t[1], t[2] + 0.09];
    }
    const mid: Vec3 = [
      root[0] * 0.48 + t[0] * 0.52,
      root[1] * 0.48 + t[1] * 0.52,
      root[2] * 0.48 + t[2] * 0.52 - 0.018,
    ];
    return k.path(
      c,
      [root, mid, t],
      [0.027, cheek ? 0.052 : 0.033, 0],
      [0.021, cheek ? 0.038 : 0.026, 0],
      name,
      cheek ? 6 : 5,
      5,
    );
  }
  return leaf(k, c, a, b, t, bulge, name, 3, 2);
}
function wolf(): THREE.Group {
  const k = new CastleKit();
  k.group.name = 'wolf';
  const body = k.mesh(
    loftGeometry(
      [
        [-0.91, 0, 0, 0, -0.09],
        [-0.87, 0.075, 0.055, 0, -0.1],
        [-0.74, 0.13, 0.09, 0, -0.14],
        [-0.62, 0.155, 0.15, 0, -0.25],
        [-0.49, 0.2, 0.17, 0, -0.28],
        [-0.32, 0.22, 0.21, 0, -0.21],
        [-0.08, 0.17, 0.19, 0, -0.2],
        [0.17, 0.14, 0.15, 0, -0.24],
        [0.38, 0.18, 0.2, 0, -0.22],
        [0.56, 0.085, 0.105, 0, -0.19],
        [0.6, 0, 0, 0, -0.17],
      ],
      32,
      18,
    ).rotateX(Math.PI / 2),
    fur,
  );
  body.geometry = branchedWolfCore(body.geometry);
  body.name = 'continuous-wolf-spine-skull-and-four-extruded-legs';
  const verts = body.geometry.getAttribute('position'),
    colors: number[] = [];
  for (let i = 0; i < verts.count; i++) {
    const x = verts.getX(i),
      y = verts.getY(i),
      z = verts.getZ(i);
    const mask = THREE.MathUtils.smoothstep(-z, 0.45, 0.7) * (1 - THREE.MathUtils.smoothstep(y, 0.16, 0.3));
    const c = new THREE.Color(fur).lerp(new THREE.Color(0xa5a2a2), mask * 0.8);
    c.multiplyScalar(1 + 0.035 * Math.sin(x * 31 + y * 27 + z * 21));
    colors.push(c.r, c.g, c.b);
  }
  body.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const bodyMaterial = (body.material as THREE.MeshStandardMaterial).clone();
  bodyMaterial.color.set(0xffffff);
  bodyMaterial.vertexColors = true;
  bodyMaterial.roughness = 0.88;
  body.material = bodyMaterial;

  for (const side of [-1, 1]) {
    for (const zz of [-0.64, 0.15])
      for (let toe = 0; toe < 3; toe++) {
        const xx = (zz < 0 ? side * 0.17 : side * 0.2) + (toe - 1) * 0.035;
        k.path(
          bone,
          [
            [xx, -0.57, zz + 0.035],
            [xx, -0.585, zz - 0.005],
            [xx, -0.598, zz - 0.035],
          ],
          [0.014, 0.012, 0],
          undefined,
          'wolf-claw',
          4,
          5,
        );
      }
    wolfLeaf(
      k,
      charcoal,
      [side * 0.1, 0.37, -0.58],
      [side * 0.22, 0.32, -0.45],
      [side * 0.28, 0.47, -0.17],
      0.018,
      'pointed-wolf-ear',
    );
    wolfLeaf(
      k,
      0x76636e,
      [side * 0.13, 0.39, -0.592],
      [side * 0.2, 0.37, -0.49],
      [side * 0.256, 0.45, -0.2],
      0.004,
      'inset-ear',
    );
    // Cheek/neck locks overlap as directional fur, not swollen joints.
    for (let i = 0; i < 6; i++)
      wolfLeaf(
        k,
        i === 0 ? silver : fur,
        [side * (0.11 + i * 0.014), 0.25 - i * 0.018, -0.62 + i * 0.018],
        [side * (0.14 + i * 0.018), 0.33 - i * 0.016, -0.5 + i * 0.018],
        [side * (0.23 + i * 0.02), 0.2 - i * 0.036, -0.39 + i * 0.028],
        0.018,
        'swept-cheek-ruff',
      );
    for (let i = 0; i < 6; i++)
      wolfLeaf(
        k,
        charcoal,
        [side * 0.11, 0.36 - i * 0.015, -0.32 + i * 0.075],
        [side * 0.19, 0.28 - i * 0.01, -0.21 + i * 0.075],
        [side * (0.23 - i * 0.007), 0.3 - i * 0.01, -0.11 + i * 0.08],
        0.018,
        'spine-fur-layer',
      );
    embeddedPredatorEye(k, body, side, 0.11, 0.32, 1, 'wolf');
    k.path(
      charcoal,
      [
        [side * 0.06, 0.32, -0.64],
        [side * 0.12, 0.355, -0.615],
        [side * 0.18, 0.36, -0.55],
      ],
      [0.025, 0.035, 0.008],
      [0.018, 0.022, 0.005],
      'sculpted-brow',
      8,
      6,
    );
  }
  k.path(
    fur,
    [
      [0, 0.22, 0.49],
      [0.06, 0.27, 0.67],
      [0.14, 0.38, 0.85],
      [0.28, 0.5, 0.94],
      [0.42, 0.48, 0.91],
    ],
    [0.095, 0.145, 0.13, 0.08, 0],
    [0.1, 0.12, 0.11, 0.06, 0],
    'swept-bushy-tail',
    12,
    10,
  );
  k.form(
    black,
    [
      [0.075, 0.04, 0.025, 0, -0.87],
      [0.105, 0.065, 0.035, 0, -0.89],
      [0.14, 0.055, 0.025, 0, -0.88],
      [0.155, 0, 0, 0, -0.87],
    ],
    'nose-leather',
    10,
    8,
  );
  for (let i = 0; i < 6; i++) {
    const x = (i - 2.5) * 0.045;
    k.path(
      charcoal,
      [
        [x, 0.29, -0.51],
        [x * 1.1, 0.405, -0.36],
        [x * 1.15, 0.36, -0.14],
      ],
      [0.022, 0.036, 0],
      [0.022, 0.032, 0],
      'rooted-swept-crown-fur',
      5,
      5,
    );
  }
  // Connected cheek-to-jaw mouth seam follows the actual elongated muzzle.
  for (const side of [-1, 1])
    k.path(
      black,
      [
        [side * 0.055, 0.056, -0.872],
        [side * 0.11, 0.06, -0.77],
        [side * 0.145, 0.105, -0.67],
      ],
      [0.004, 0.008, 0.003],
      undefined,
      'wolf-mouth-seam',
      9,
      5,
    );
  // Pose the continuous body through a smooth spatial field: grounded toes stay
  // fixed while the chest drops between forward-reaching forelegs. Head proportions
  // remain intact; this is not an overall height scale.
  k.group.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.updateMatrix();
    o.geometry.applyMatrix4(o.matrix);
    o.position.set(0, 0, 0);
    o.rotation.set(0, 0, 0);
    o.scale.set(1, 1, 1);
    o.updateMatrix();
    const p = o.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      const bodyWeight = THREE.MathUtils.smoothstep(y, -0.6, -0.08);
      const footWeight = 1 - THREE.MathUtils.smoothstep(y, -0.58, -0.05);
      const drop = 0.13 + 0.05 * THREE.MathUtils.smoothstep(-z, -0.1, 0.45);
      p.setXYZ(i, x * (1 + 0.16 * footWeight), y - drop * bodyWeight, z + (z < 0 ? -0.1 : 0.06) * footWeight);
    }
    o.geometry.computeVertexNormals();
  });
  dressCastleBeast(k.group);
  return k.group;
}
function cape(k: CastleKit): void {
  for (const side of [-1, 1]) {
    const boundary = new THREE.CatmullRomCurve3(
      [
        [0.04, 0.19, 0.34],
        [0.3, 0.52, 0.39],
        [0.55, 0.36, 0.42],
        [0.84, 0.83, 0.47],
        [1.32, 0.78, 0.46],
        [1.2, 1.55, 0.45],
        [0.9, 2.16, 0.37],
        [0.32, 2.61, 0.22],
      ].map((p) => new THREE.Vector3(side * p[0], p[1], p[2])),
    );
    for (const outer of [false, true]) {
      const p: number[] = [],
        uv: number[] = [],
        ix: number[] = [],
        cols = outer ? 32 : 36,
        rows = 10;
      for (let v = 0; v <= rows; v++)
        for (let u = 0; u <= cols; u++) {
          const t = u / cols,
            r = v / rows,
            edge = boundary.getPoint(t),
            anchor = new THREE.Vector3(side * 0.13, 2.52, 0.2);
          const pt = anchor.lerp(edge, r);
          pt.z +=
            (0.105 * Math.sin(t * Math.PI * 8 + 0.3) + 0.014 * Math.sin(t * Math.PI * 19)) *
              Math.sin(r * Math.PI) *
              Math.pow(r, 0.4) +
            (outer ? 0.012 : -0.012);
          pt.y -= 0.07 * Math.sin(t * Math.PI) ** 2 * r * (1 - r);
          p.push(...pt.toArray());
          uv.push(t, r);
        }
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
          const a = j * (cols + 1) + i,
            b = a + cols + 1;
          if ((side === 1) !== outer) ix.push(a, b, a + 1, a + 1, b, b + 1);
          else ix.push(a, a + 1, b, a + 1, b + 1, b);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(ix);
      g.computeVertexNormals();
      const m = k.mesh(g, outer ? black : red);
      m.name = outer ? 'black-cape-outer' : 'crimson-scalloped-cape-lining';
      (m.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    }
    const edgePts = Array.from({ length: 65 }, (_, i) => i / 64).map(
      (t) =>
        boundary
          .getPoint(t)
          .add(new THREE.Vector3(0, 0, -0.018))
          .toArray() as [number, number, number],
    );
    k.path(
      black,
      edgePts,
      [0.012, 0.012, 0.012, 0.012, 0.012, 0.012, 0.012, 0.012, 0.012],
      undefined,
      'cape-tailored-edge',
      64,
      5,
    );
  }
}
function dracula(): THREE.Group {
  const k = new CastleKit();
  k.group.name = 'dracula';
  cape(k);
  for (const side of [-1, 1]) {
    const xx = side * 0.19,
      zz = side < 0 ? -0.17 : 0.11;
    k.path(
      black,
      [
        [xx, 1.49, 0.02],
        [xx * (side < 0 ? 0.6 : 0.95), 1.03, zz + (side < 0 ? -0.04 : 0)],
        [xx * (side < 0 ? 0.84 : 1.08), 0.55, zz + 0.035],
        [xx * 1.08, 0.16, zz],
      ],
      [0.13, 0.115, 0.08, 0.065],
      [0.14, 0.12, 0.08, 0.07],
      'long-tailored-trouser',
      18,
      12,
    );
    const shoe = k.form(
      black,
      [
        [0.015, 0.09, 0.19, xx * 1.08, zz - 0.085],
        [0.07, 0.105, 0.22, xx * 1.08, zz - 0.1],
        [0.16, 0.075, 0.12, xx * 1.08, zz],
        [0.28, 0.075, 0.09, xx * 1.02, zz + 0.015],
        [0.52, 0.085, 0.085, xx * (side < 0 ? 0.84 : 1.08), zz + 0.035],
        [0.78, 0.125, 0.13, xx * (side < 0 ? 0.72 : 1), zz + (side < 0 ? -0.025 : 0.02)],
        [0.84, 0.13, 0.13, xx * (side < 0 ? 0.68 : 1), zz + (side < 0 ? -0.03 : 0.01)],
        [0.89, 0.125, 0.125, xx * (side < 0 ? 0.65 : 1), zz + (side < 0 ? -0.035 : 0)],
        [0.94, 0, 0, xx * (side < 0 ? 0.64 : 1), zz + (side < 0 ? -0.035 : 0)],
      ],
      'pointed-leather-boot',
      14,
      16,
    );
    shoe.material = k.material(black, 'leather');
    const bx = xx * (side < 0 ? 0.68 : 1);
    shoe.updateMatrixWorld(true);
    const bootRay = new THREE.Raycaster();
    const onBoot = (x: number, y: number, lift = 0.004): Vec3 => {
      bootRay.set(new THREE.Vector3(x, y, -5), new THREE.Vector3(0, 0, 1));
      const h = bootRay.intersectObject(shoe)[0];
      if (!h) throw new Error('Boot panel projection miss');
      return [x, y, h.point.z - lift];
    };
    const greave = leaf(
      k,
      black,
      [bx - 0.065, 0.82, zz - 0.16],
      [bx + 0.065, 0.82, zz - 0.16],
      [xx * 1.02, 0.25, zz - 0.085],
      0.008,
      'leather-boot-greave-panel',
      8,
      2,
    );
    const gp = greave.geometry.getAttribute('position'),
      gl = 27;
    for (let i = 0; i < gp.count; i++) {
      const front = i < gl || (i >= gl * 2 && (i - gl * 2) % 4 < 2);
      const p = onBoot(gp.getX(i), gp.getY(i), front ? 0.007 : 0.003);
      gp.setZ(i, p[2]);
    }
    greave.geometry.computeVertexNormals();
    k.path(
      gold,
      [onBoot(xx * 1.08 - 0.045, 0.14), onBoot(xx * 1.08, 0.18), onBoot(xx * 1.08 + 0.045, 0.14)],
      [0.008, 0.008, 0.008],
      undefined,
      'boot-seam',
      8,
      5,
      'metal',
    );
  }
  const torso = k.form(
    black,
    [
      [1.24, 0.24, 0.17],
      [1.45, 0.25, 0.18],
      [1.8, 0.22, 0.16],
      [2.15, 0.31, 0.19],
      [2.42, 0.39, 0.2],
      [2.57, 0.28, 0.17],
      [2.65, 0.12, 0.1],
      [2.68, 0, 0],
    ],
    'tailored-adult-torso',
    20,
    24,
  );
  for (const side of [-1, 1]) {
    const shoulder: Vec3 = [side * 0.24, 2.43, 0.015];
    const elbow: Vec3 = side < 0 ? [-0.43, 1.97, -0.01] : [0.64, 2.16, -0.02];
    const wrist: Vec3 = side < 0 ? [-0.48, 1.4, -0.13] : [0.95, 2.43, -0.2];
    const sleeve = k.path(
      black,
      [shoulder, elbow, wrist],
      [0.11, 0.13, 0.1, 0.075],
      [0.15, 0.13, 0.09, 0.07],
      'tailored-connected-sleeve',
      18,
      12,
    );
    // Compress the same continuous sleeve surface around bent joints, not ring ornaments.
    const sleeveP = sleeve.geometry.getAttribute('position');
    const sleeveCenter = new THREE.CatmullRomCurve3([shoulder, elbow, wrist].map((p) => new THREE.Vector3(...p)));
    const sleeveSamples = sleeveCenter.getPoints(80);
    for (let i = 0; i < sleeveP.count; i++) {
      const x = sleeveP.getX(i),
        y = sleeveP.getY(i),
        z = sleeveP.getZ(i);
      const de = Math.hypot(x - elbow[0], y - elbow[1], z - elbow[2]);
      const fold = 0.006 * Math.sin((y - elbow[1]) * 30 + x * 5) * Math.exp(-((de / 0.23) ** 4));
      const point = new THREE.Vector3(x, y, z);
      let closest = sleeveSamples[0],
        distance = Infinity;
      for (const sample of sleeveSamples) {
        const d = sample.distanceToSquared(point);
        if (d < distance) {
          distance = d;
          closest = sample;
        }
      }
      const radial = point.clone().sub(closest).normalize();
      sleeveP.setXYZ(i, x + radial.x * fold, y + radial.y * fold, z + radial.z * fold);
    }
    sleeve.geometry.computeVertexNormals();
    k.path(
      bone,
      [
        [wrist[0] * 0.985, wrist[1] + 0.025, wrist[2] + 0.005],
        wrist,
        [wrist[0] * 1.015, wrist[1] - 0.035, wrist[2] - 0.015],
      ],
      [0.077, 0.081, 0.072],
      [0.07, 0.074, 0.065],
      'ivory-cuff',
      6,
      10,
    );
    tubeHand(k, [wrist[0], wrist[1] + (side > 0 ? 0.02 : -0.08), wrist[2] - 0.015], bone, side > 0);
  }
  // Long coat tails and welted lapels are separate tailored panels, not boxes.
  for (const side of [-1, 1]) {
    const tail = leaf(
      k,
      black,
      [side * 0.04, 1.71, -0.205],
      [side * 0.3, 1.65, -0.14],
      [side * 0.44, 0.35, -0.02],
      0.055,
      'long-split-coattail',
      10,
      4,
    );
    const tp = tail.geometry.getAttribute('position');
    for (let i = 0; i < tp.count; i++) {
      const y = tp.getY(i),
        v = THREE.MathUtils.clamp((1.71 - y) / 1.36, 0, 1);
      const u = THREE.MathUtils.clamp(
        (Math.abs(tp.getX(i)) - (0.04 + 0.4 * v)) / Math.max(0.015, 0.26 * (1 - v)),
        0,
        1,
      );
      tp.setZ(
        i,
        tp.getZ(i) - 0.075 * Math.sin(v * Math.PI) + 0.024 * Math.sin(u * Math.PI * 2) * Math.sin(v * Math.PI),
      );
      tp.setX(i, tp.getX(i) + side * 0.025 * Math.sin(v * Math.PI));
    }
    tail.geometry.computeVertexNormals();
    leaf(
      k,
      bone,
      [side * 0.085, 2.68, -0.07],
      [side * 0.23, 2.57, -0.16],
      [side * 0.085, 2.5, -0.23],
      0.018,
      'folded-ivory-collar',
      4,
      4,
    );
    leaf(
      k,
      0x30313a,
      [side * 0.075, 2.55, -0.205],
      [side * 0.32, 2.43, -0.205],
      [side * 0.105, 1.96, -0.245],
      0.045,
      'notched-jacket-lapel',
    );
    k.path(
      gold,
      [
        [side * 0.06, 2.52, -0.199],
        [side * 0.28, 2.4, -0.204],
        [side * 0.1, 1.9, -0.23],
        [side * 0.18, 1.53, -0.22],
      ],
      [0.005, 0.005, 0.005, 0.005],
      undefined,
      'gold-lapel-welt',
      20,
      5,
      'metal',
    );
    leaf(
      k,
      red,
      [side * 0.1, 2.59, 0.06],
      [side * 0.44, 2.55, 0.12],
      [side * 0.55, 2.93, 0.15],
      0.025,
      'high-crimson-collar',
    );
    k.path(
      gold,
      [
        [side * 0.1, 2.59, 0.03],
        [side * 0.55, 2.93, 0.12],
        [side * 0.44, 2.55, 0.09],
      ],
      [0.008, 0.008, 0.008],
      undefined,
      'collar-trim',
      12,
      5,
      'metal',
    );
  }
  patch(
    k,
    torso,
    0x4f4140,
    [
      [-0.12, 1.48],
      [-0.15, 2.3],
      [0, 2.5],
      [0.15, 2.3],
      [0.12, 1.48],
      [0, 1.39],
    ],
    0.005,
    'waistcoat',
  );
  for (let i = 0; i < 5; i++) k.sphere(gold, [0, 1.57 + i * 0.145, -0.205], [0.018, 0.018, 0.012], k.group, 8, 'metal');
  const cp: number[] = [],
    cu: number[] = [],
    ci: number[] = [];
  const cr = 10,
    cc = 12,
    layer = (cr + 1) * (cc + 1);
  for (let back = 0; back < 2; back++)
    for (let j = 0; j <= cr; j++)
      for (let i = 0; i <= cc; i++) {
        const u = i / cc,
          v = j / cr;
        cp.push(
          (u - 0.5) * (0.06 + 0.15 * Math.sin(v * Math.PI * 0.8)),
          2.55 - 0.28 * v + 0.012 * Math.cos(u * Math.PI * 6) * v,
          -0.22 -
            0.04 * Math.sin(v * Math.PI * 0.7) -
            0.009 * Math.cos(u * Math.PI * 6) * Math.sin(v * Math.PI) +
            (back ? 0.003 : -0.003),
        );
        cu.push(u, v);
        if (j < cr && i < cc) {
          const a = back * layer + j * (cc + 1) + i,
            n = a + cc + 1;
          if (back) ci.push(a, n, a + 1, a + 1, n, n + 1);
          else ci.push(a, a + 1, n, a + 1, n + 1, n);
        }
      }
  const border = [
    ...Array.from({ length: cc + 1 }, (_, i) => i),
    ...Array.from({ length: cr }, (_, j) => (j + 1) * (cc + 1) + cc),
    ...Array.from({ length: cc }, (_, i) => cr * (cc + 1) + cc - 1 - i),
    ...Array.from({ length: cr - 1 }, (_, j) => (cr - 1 - j) * (cc + 1)),
  ];
  for (let i = 0; i < border.length; i++) {
    const a = border[i],
      b = border[(i + 1) % border.length];
    const base = cp.length / 3;
    for (const id of [a, b, a + layer, b + layer]) cp.push(...cp.slice(id * 3, id * 3 + 3));
    cu.push(0, 0, 1, 0, 0, 1, 1, 1);
    ci.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
  cg.setAttribute('uv', new THREE.Float32BufferAttribute(cu, 2));
  cg.setIndex(ci);
  cg.computeVertexNormals();
  const cravat = k.mesh(cg, bone);
  cravat.name = 'pleated-cravat-fan';
  k.sphere(gold, [0, 2.54, -0.23], [0.058, 0.068, 0.025], k.group, 10, 'metal');
  k.sphere(0xa41f3c, [0, 2.54, -0.251], [0.035, 0.047, 0.012], k.group, 10, 'eye');
  const headStart = k.group.children.length;
  for (const mesh of buildAuthoredDraculaFace()) k.group.add(mesh);
  for (const ob of k.group.children.slice(headStart))
    if (ob instanceof THREE.Mesh) {
      ob.updateMatrix();
      ob.geometry.applyMatrix4(ob.matrix);
      ob.position.set(0, 0, 0);
      ob.rotation.set(0, 0, 0);
      ob.scale.set(1, 1, 1);
      ob.updateMatrix();
      ob.geometry.translate(0, -2.67, 0);
      ob.geometry.rotateY(-0.12);
      ob.geometry.rotateX(-0.07);
      ob.geometry.translate(0, 2.67, 0);
    }
  const orb = k.sphere(0x650c23, [0.97, 2.7, -0.23], [0.085, 0.1, 0.085], k.group, 16, 'glow');
  orb.name = 'held-crimson-magic-core';
  for (let i = 0; i < 3; i++) {
    const angle = i * 2.1;
    const points: Vec3[] = Array.from({ length: 6 }, (_, j) => {
      const t = j / 5,
        a = angle + t * 1.9,
        r = 0.08 + 0.22 * t * t;
      return [0.97 + Math.cos(a) * r, 2.7 + Math.sin(a) * r * 0.8 + 0.06 * t, -0.23 + Math.sin(a * 1.3 + i) * 0.08];
    });
    k.path(
      i % 2 ? 0x99213a : 0x62091e,
      points,
      [0, 0.009, 0.016, 0.008, 0],
      undefined,
      'asymmetric-crimson-wisp',
      16,
      6,
      'glow',
    );
  }
  // Whole-tailoring contrapposto field preserves layer clearances and planted boots.
  k.group.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.updateMatrix();
    o.geometry.applyMatrix4(o.matrix);
    o.position.set(0, 0, 0);
    o.rotation.set(0, 0, 0);
    o.scale.set(1, 1, 1);
    o.updateMatrix();
    const p = o.geometry.getAttribute('position');
    const n = o.geometry.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i),
        x = p.getX(i);
      const t = THREE.MathUtils.clamp((y - 0.3) / 2.5, 0, 1);
      p.setX(i, x + 0.045 * Math.sin(t * Math.PI * 0.85));
      if (o.geometry.userData.authoredFace) {
        const slope = y > 0.3 && y < 2.8 ? (0.045 * Math.cos(t * Math.PI * 0.85) * Math.PI * 0.85) / 2.5 : 0;
        const normal = new THREE.Vector3(n.getX(i), n.getY(i) - slope * n.getX(i), n.getZ(i)).normalize();
        n.setXYZ(i, normal.x, normal.y, normal.z);
      }
    }
    if (!o.geometry.userData.authoredFace) o.geometry.computeVertexNormals();
  });
  dressDracula(k.group);
  return k.group;
}
export function buildDraculaMonster(id: string, _color: number): THREE.Group | undefined {
  if (id === 'wolf') return wolf();
  if (id === 'ghoul') return ghoul();
  if (id === 'bat') return bat();
  return undefined;
}
export function buildDraculaBoss(id: string): THREE.Group | undefined {
  if (id === 'dracula') return dracula();
  if (id === 'werewolfChief') return werewolf();
  return undefined;
}
