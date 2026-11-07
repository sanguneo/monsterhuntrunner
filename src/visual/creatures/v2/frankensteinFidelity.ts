import { authorFrankensteinFace } from './frankensteinFaceTopology';
import * as THREE from 'three';
import type { Vec3 } from '../../ModelKit';
import { ZLKit, closeRings, frontSurface, fitCreature, joinedBruteSkin } from './zombieLabTools';
const P = {
  skin: 0x74815a,
  dark: 0x253028,
  leather: 0x24221e,
  lining: 0x254452,
  sole: 0x161a19,
  belt: 0x514534,
  steel: 0x8c9d9e,
  brass: 0x9a8151,
  cyan: 0x70d8e8,
  hair: 0x242a25,
};
const gauss = (x: number, y: number, sx: number, sy: number) => Math.exp(-0.5 * ((x / sx) ** 2 + (y / sy) ** 2));
/** One sculpted head surface: jaw/cheek/brow/nose are fields on the same skin, not attached balls. */
function skullGeometry(hair = false): THREE.BufferGeometry {
  const rings = hair
    ? [
        [2.865, 0.302, 0.235, -0.005],
        [2.94, 0.305, 0.24, 0.005],
        [3.035, 0.292, 0.225, 0.01],
        [3.05, 0.18, 0.14, 0.01],
        [3.052, 0.005, 0.005, 0.01],
      ]
    : [
        [2.2, 0.13, 0.12, 0.01],
        [2.32, 0.18, 0.18, -0.01],
        [2.4, 0.26, 0.225, -0.065],
        [2.55, 0.285, 0.235, -0.05],
        [2.78, 0.29, 0.225, -0.02],
        [2.94, 0.275, 0.215, 0],
        [2.99, 0.25, 0.19, 0.005],
      ];
  const rows = hair ? 11 : 36,
    sides = hair ? 24 : 28,
    pos: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  const shape = new THREE.CatmullRomCurve3(rings.map((r) => new THREE.Vector3(r[1], r[0], r[2])));
  const centers = new THREE.CatmullRomCurve3(rings.map((r) => new THREE.Vector3(0, r[0], r[3])));
  for (let j = 0; j <= rows; j++) {
    const t = j / rows,
      r = shape.getPoint(t),
      c = centers.getPoint(t);
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2,
        sn = Math.sin(a),
        cs = Math.cos(a),
        x = Math.sign(sn) * Math.pow(Math.abs(sn), 0.72) * r.x,
        y = r.y;
      let z = c.z + Math.sign(cs) * Math.pow(Math.abs(cs), 0.72) * r.z;
      if (!hair && cs < 0) {
        const front = Math.pow(-cs, 4);
        let form = 0;
        for (const side of [-1, 1]) {
          form += 0.058 * gauss(x - side * 0.14, y - 2.765 + side * (x - side * 0.14) * 0.18, 0.12, 0.043);
          form -= 0.03 * gauss(x - side * 0.135, y - 2.69, 0.085, 0.043);
          form += 0.035 * gauss(x - side * 0.205, y - 2.585, 0.068, 0.048);
          form -= 0.017 * gauss(x - side * 0.205, y - 2.51, 0.065, 0.055);
          form += 0.025 * gauss(x - side * 0.052, y - 2.56, 0.028, 0.025);
        }
        form +=
          0.068 * gauss(x, y - 2.68, 0.045, 0.105) +
          0.073 * gauss(x, y - 2.58, 0.059, 0.043) +
          0.03 * gauss(x, y - 2.475, 0.16, 0.035) +
          0.046 * gauss(x, y - 2.405, 0.18, 0.055);
        z -= form * front;
      }
      if (hair) z += 0.007 * Math.sin(a * 5 + t * 0.4) * Math.sin(t * Math.PI);
      pos.push(x, hair ? y + 0.014 * Math.sin(a * 13) * (1 - t) : y, z);
      uv.push(i / sides, t);
      if (j < rows && i < sides) {
        const q = j * (sides + 1) + i,
          b = q + sides + 1;
        idx.push(q, q + 1, b, q + 1, b + 1, b);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return closeRings(g, sides);
}
/** Actual opaque leather thickness, perimeter walls and separate blue inner lining. */
function layeredCloth(k: ZLKit, name: string, p: number[], idx: number[], uv: number[]): THREE.Mesh {
  const outer = new THREE.BufferGeometry();
  outer.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  outer.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  outer.setIndex(idx);
  outer.computeVertexNormals();
  const n = outer.getAttribute('normal'),
    innerP = p.slice(),
    count = p.length / 3;
  for (let i = 0; i < count; i++) {
    innerP[i * 3] -= n.getX(i) * 0.021;
    innerP[i * 3 + 1] -= n.getY(i) * 0.021;
    innerP[i * 3 + 2] -= n.getZ(i) * 0.021;
  }
  const edges = new Map<string, { a: number; b: number; count: number }>();
  for (let t = 0; t < idx.length; t += 3)
    for (let j = 0; j < 3; j++) {
      const a = idx[t + j],
        b = idx[t + ((j + 1) % 3)],
        key = [a, b].sort((a, b) => a - b).join(',');
      const e = edges.get(key);
      if (e) e.count++;
      else edges.set(key, { a, b, count: 1 });
    }
  const shellP = [...p, ...innerP],
    shellUv = [...uv, ...uv],
    shellI = idx.slice();
  for (const e of edges.values()) if (e.count === 1) shellI.push(e.a, e.b, e.b + count, e.a, e.b + count, e.a + count);
  outer.setAttribute('position', new THREE.Float32BufferAttribute(shellP, 3));
  outer.setAttribute('uv', new THREE.Float32BufferAttribute(shellUv, 2));
  outer.setIndex(shellI);
  outer.deleteAttribute('normal');
  outer.computeVertexNormals();
  const inner = new THREE.BufferGeometry();
  inner.setAttribute('position', new THREE.Float32BufferAttribute(innerP, 3));
  inner.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const innerI: number[] = [];
  for (let i = 0; i < idx.length; i += 3) innerI.push(idx[i], idx[i + 2], idx[i + 1]);
  inner.setIndex(innerI);
  inner.computeVertexNormals();
  const out = k.part(name + '-heavy-leather', P.leather, outer, 'leather');
  k.part(name + '-blue-inner-lining', P.lining, inner, 'cloth');
  return out;
}
function coat(k: ZLKit, skin: THREE.Mesh): void {
  const p: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  const rows = 18,
    cols = 34;
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= cols; i++) {
      const u = i / cols,
        t = j / rows,
        a = 0.29 + u * (Math.PI * 2 - 0.58);
      const side = Math.abs(Math.sin(a));
      // Deep armhole under the axilla; continuous side/back leather, not a cape behind an apron.
      const top = 2.28 - 0.52 * Math.pow(side, 6),
        y = 0.5 + t * (top - 0.5);
      const bodyScale = Math.sqrt(Math.max(0.08, 1 - ((y - 1.71) / 0.73) ** 2));
      const skirt = Math.max(0, (1.05 - y) / 0.55);
      const rx = (0.39 + 0.14 * Math.exp(-Math.pow((y - 1.98) / 0.38, 2))) * bodyScale + 0.055 + skirt * 0.25,
        rz = 0.29 * bodyScale + 0.055 + skirt * 0.14;
      let x = rx * Math.sin(a),
        z = -rz * Math.cos(a);
      if (y >= 1.15 && Math.cos(a) > 0.4 && Math.abs(x) < (rx - 0.055) * 0.9) z = frontSurface(skin, x, y, 0.055)[2];
      const fold = 0.014 * Math.sin(a * 7 + t * 2) * Math.pow(1 - t, 1.3);
      x += Math.sin(a) * fold + skirt * 0.055;
      z += Math.cos(a) * fold;
      p.push(x, y, z);
      uv.push(u, t);
      if (j < rows && i < cols) {
        const q = j * (cols + 1) + i,
          b = q + cols + 1;
        idx.push(q, b, q + 1, q + 1, b, b + 1);
      }
    }
  const shell = layeredCloth(k, 'tailored-wraparound-coat', p, idx, uv);
  for (const column of [0, cols]) {
    const line: Vec3[] = Array.from({ length: rows + 1 }, (_, j) => {
      const q = (j * (cols + 1) + column) * 3;
      return [p[q], p[q + 1], p[q + 2] - 0.008];
    });
    k.curve(
      'connected-blue-coat-edge-binding',
      P.lining,
      line,
      Array(line.length).fill(0.012),
      undefined,
      22,
      6,
      'cloth',
    );
  }

  for (const side of [-1, 1]) {
    // Curved shoulder bridge connects front and back around the exposed deltoid.
    const sp: number[] = [],
      su: number[] = [],
      si: number[] = [],
      nr = 12,
      nc = 4;
    for (let j = 0; j <= nr; j++)
      for (let i = 0; i <= nc; i++) {
        const t = j / nr,
          u = i / nc,
          a = t * Math.PI;
        sp.push(side * (0.23 + u * 0.15), 2.17 + 0.17 * Math.sin(a), -0.245 * Math.cos(a));
        su.push(u, t);
        if (j < nr && i < nc) {
          const q = j * (nc + 1) + i,
            b = q + nc + 1;
          if (side > 0) si.push(q, b, q + 1, q + 1, b, b + 1);
          else si.push(q, q + 1, b, q + 1, b + 1, b);
        }
      }
    layeredCloth(k, 'curved-coat-shoulder-' + side, sp, si, su);
    k.plate(
      'folded-leather-lapel',
      P.leather,
      [
        [side * 0.13, 2.3, -0.25],
        [side * 0.3, 2.28, -0.265],
        [side * 0.34, 2.08, -0.365],
        [side * 0.2, 1.98, -0.43],
        [side * 0.15, 2.13, -0.395],
      ],
      0.025,
      'leather',
    );
    for (const y of [1.18, 1.49, 1.81, 2.08]) {
      const point = frontSurface(shell, side * (y < 1.4 ? 0.19 : 0.215), y, 0.012);
      k.sphere(P.steel, point, [0.022, 0.022, 0.009], k.group, 8, 'metal').name = 'seated-coat-fastener';
    }
  }
}
function boots(k: ZLKit, side: number, z: number): void {
  k.body(
    'heavy-rubber-boot-sole',
    P.sole,
    [
      [0.015, 0.17, 0.29, side * 0.32, z - 0.1],
      [0.04, 0.19, 0.31, side * 0.32, z - 0.11],
      [0.085, 0.185, 0.3, side * 0.32, z - 0.1],
    ],
    5,
    14,
    'leather',
  );
  const boot = k.body(
    'shaped-black-leather-boot',
    P.leather,
    [
      [0.065, 0.18, 0.29, side * 0.32, z - 0.1],
      [0.14, 0.18, 0.25, side * 0.32, z - 0.07],
      [0.27, 0.14, 0.16, side * 0.32, z],
      [0.42, 0.135, 0.14, side * 0.32, z + 0.015],
    ],
    11,
    16,
    'leather',
  );
  for (const y of [0.24, 0.34]) {
    const point = frontSurface(boot, side * 0.32, y, 0.012);
    k.box(P.belt, point, [0.26, 0.046, 0.027], k.group, 0.012, 'leather').name = 'fitted-boot-leather-strap';
    k.box(
      P.steel,
      [point[0] + side * 0.06, point[1], point[2] - 0.022],
      [0.075, 0.063, 0.018],
      k.group,
      0.006,
      'metal',
    ).name = 'boot-strap-functional-buckle';
  }
}
export function buildFrankensteinFidelity(): THREE.Group {
  const k = new ZLKit();
  k.group.name = 'frankenstein';
  const wrists: Vec3[] = [
    [-0.87, 1.05, -0.22],
    [0.99, 1.66, -0.38],
  ];
  const skin = k.part('single-continuous-torso-shoulders-arms', P.skin, joinedBruteSkin(wrists, 40, true, true));
  k.body(
    'continuous-tailored-trouser-pelvis',
    P.sole,
    [
      [0.82, 0.28, 0.21, 0, 0.03],
      [0.99, 0.405, 0.24, 0, 0.02],
      [1.16, 0.275, 0.21, 0, 0],
    ],
    8,
    14,
    'cloth',
  );
  const skull = authorFrankensteinFace(k, P.skin);
  k.part('short-directional-cropped-hair', P.hair, skullGeometry(true), 'cloth');

  for (const side of [-1, 1]) {
    k.body(
      'connected-ear-cartilage',
      P.skin,
      [
        [2.51, 0.014, 0.025, side * 0.285, 0.015],
        [2.56, 0.035, 0.052, side * 0.3, 0.015],
        [2.68, 0.033, 0.049, side * 0.3, 0.02],
        [2.73, 0.01, 0.016, side * 0.285, 0.02],
      ],
      9,
      10,
    );
    const contact = k.cylinder(P.steel, [side * 0.27, 2.375, -0.015], 0.09, 0.09, 0.2, k.group, 16, 'metal');
    contact.rotation.z = Math.PI / 2;
    contact.name = 'seated-neck-electrode-housing';
    const disk = k.cylinder(P.cyan, [side * 0.375, 2.375, -0.015], 0.071, 0.071, 0.016, k.group, 16, 'glow');
    disk.rotation.z = Math.PI / 2;
    disk.name = 'inset-neck-electrode-emitter';
    const z = side < 0 ? 0.13 : -0.13;
    k.curve(
      'tailored-heavy-trouser-leg',
      P.sole,
      [
        [side * 0.2, 0.99, 0.02],
        [side * 0.27, 0.64, z],
        [side * 0.32, 0.28, z],
      ],
      [0.19, 0.17, 0.13],
      undefined,
      15,
      12,
      'cloth',
    );
    boots(k, side, z);
    const hand = wrists[side < 0 ? 0 : 1];
    for (let f = 0; f < 4; f++) {
      const x = hand[0] + (f - 1.5) * 0.085;
      k.curve(
        side < 0 ? 'curled-weighted-grip-finger' : 'anatomical-casting-finger',
        P.skin,
        side < 0
          ? [
              [x, hand[1] + 0.08, hand[2] - 0.15],
              [x, hand[1] + 0.19, hand[2] - 0.27],
              [x, hand[1] + 0.035, hand[2] - 0.31],
            ]
          : [
              [x, hand[1] + 0.1, hand[2] - 0.18],
              [hand[0] + (f - 1.5) * 0.12, hand[1] + 0.32, hand[2] - 0.25],
              [hand[0] + (f - 1.5) * 0.131, hand[1] + 0.4, hand[2] - 0.31],
            ],
        side < 0 ? [0.05, 0.055, 0.04] : [0.045, 0.038, 0.024],
        undefined,
        10,
        8,
      );
    }
    k.curve(
      'connected-opposing-thumb',
      P.skin,
      side < 0
        ? [
            [hand[0] + 0.125, hand[1] + 0.025, hand[2] - 0.1],
            [hand[0] + 0.15, hand[1] + 0.08, hand[2] - 0.28],
            [hand[0] - 0.02, hand[1] + 0.06, hand[2] - 0.29],
          ]
        : [
            [hand[0] - side * 0.125, hand[1] + 0.025, hand[2] - 0.1],
            [hand[0] - side * 0.24, hand[1] + 0.12, hand[2] - 0.2],
            [hand[0] - side * 0.27, hand[1] + 0.2, hand[2] - 0.24],
          ],
      [0.06, 0.046, 0.025],
      undefined,
      10,
      8,
    );
    const elbow = new THREE.Vector3(side * 0.75, 1.62, -0.08),
      end = new THREE.Vector3(...hand),
      axis = end.clone().sub(elbow).normalize(),
      center = elbow.clone().lerp(end, 0.68);
    const cuff = k.cylinder(P.steel, center.toArray() as Vec3, 0.188, 0.188, 0.23, k.group, 18, 'metal');
    cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
    cuff.name = 'solid-electrical-bracer-housing';
    for (const shift of [-0.115, 0.115]) {
      const c = center.clone().addScaledVector(axis, shift);
      const rim = k.torus(
        shift < 0 ? P.brass : 0x1cbace,
        c.toArray() as Vec3,
        0.19,
        0.012,
        k.group,
        shift < 0 ? 'metal' : 'glow',
      );
      rim.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis);
      rim.name = 'seated-bracer-rim';
    }
  }
  k.curve(
    'healed-forehead-seam',
    P.skin,
    [-0.15, -0.06, 0.03].map((x) => frontSurface(skull, x, 2.819, 0.004)),
    [0.004, 0.004, 0.004],
    undefined,
    8,
    4,
  );
  for (let i = 0; i < 4; i++) {
    const a = frontSurface(skull, -0.13 + i * 0.045, 2.835, 0.006),
      b = frontSurface(skull, -0.11 + i * 0.045, 2.8, 0.006);
    k.curve('small-harmless-forehead-stitch', P.dark, [a, b], [0.004, 0.004], undefined, 3, 4);
  }
  coat(k, skin);
  for (const y of [1.38, 1.77]) {
    const p = frontSurface(skin, 0, y, 0.055);
    k.box(P.belt, p, [0.4, 0.075, 0.035], k.group, 0.014, 'leather').name = 'structured-chest-restraint';
    k.box(P.steel, [0.045, p[1], p[2] - 0.03], [0.095, 0.105, 0.022], k.group, 0.008, 'metal').name =
      'closed-restraint-buckle';
  }
  k.group.userData.artStage = 'Frankenstein fidelity geometry slice; maps/visual approval pending';
  return fitCreature(k.group, true, 3.16);
}
