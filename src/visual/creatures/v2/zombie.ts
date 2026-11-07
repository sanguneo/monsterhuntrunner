import { croppedZombieHair } from './zombieHair';
import { buildDetailedZombieSkin } from './zombieSkinAnatomy';
import {
  authorRaggedWrapVest,
  authorSeatedBootStraps,
  authorFoldedMantleCollar,
  authorGravePauldron,
  authorRoyalCape,
  leanRoyalCharge,
  leanWorkerHunch,
} from './zombieIdentityGarments';
import { applyZombieRuntimeMaterials } from './zombieRuntimeMaterials';
import { authorZombieQuadFace } from './zombieFaceTopology';
import * as THREE from 'three';
import type { Vec3 } from '../../ModelKit';
import { ZLKit, fitCreature, frontSurface, closeRings, sideSurface } from './zombieLabTools';

const C = {
  skin: 0x74815a,
  dark: 0x263029,
  coat: 0x4c3528,
  edge: 0x876343,
  stitch: 0xbba17a,
  iron: 0x62615a,
  brass: 0xa68742,
  ivory: 0xdad4ae,
};

/** One continuous axial surface joins hound rump, chest, nape, skull and muzzle. */
function houndBody(): THREE.BufferGeometry {
  const sections = [
    new THREE.Vector3(0.69, 0.64, 0.01),
    new THREE.Vector3(0.56, 0.72, 0.16),
    new THREE.Vector3(0.26, 0.76, 0.14),
    new THREE.Vector3(-0.02, 0.72, 0.19),
    new THREE.Vector3(-0.25, 0.75, 0.16),
    new THREE.Vector3(-0.43, 0.7, 0.145),
    new THREE.Vector3(-0.59, 0.65, 0.125),
    new THREE.Vector3(-0.74, 0.645, 0.095),
    new THREE.Vector3(-0.87, 0.64, 0.065),
  ];
  const path = new THREE.CatmullRomCurve3(sections),
    p: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  const rows = 33,
    sides = 20;
  for (let j = 0; j <= rows; j++) {
    const c = path.getPoint(j / rows);
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const depthScale = c.x < -0.55 ? 0.75 : 1.12;
      const brow =
        0.028 * Math.exp(-Math.pow((c.x + 0.55) / 0.11, 2)) * Math.pow(Math.sin(a), 2) * Math.max(0, Math.cos(a));
      p.push(
        Math.sin(a) * c.z,
        c.y +
          (c.x < -0.62 ? Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), 0.65) : Math.cos(a)) *
            c.z *
            depthScale +
          brow,
        c.x,
      );
      uv.push(i / sides, j / rows);
      if (j < rows && i < sides) {
        const q = j * (sides + 1) + i;
        idx.push(q, q + 1, q + sides + 1, q + 1, q + sides + 2, q + sides + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return closeRings(g, sides);
}
function houndSection(z: number): THREE.Vector3 {
  const sections = [
    new THREE.Vector3(0.69, 0.64, 0.01),
    new THREE.Vector3(0.56, 0.72, 0.16),
    new THREE.Vector3(0.26, 0.76, 0.14),
    new THREE.Vector3(-0.02, 0.72, 0.19),
    new THREE.Vector3(-0.25, 0.75, 0.16),
    new THREE.Vector3(-0.43, 0.7, 0.145),
    new THREE.Vector3(-0.59, 0.65, 0.125),
    new THREE.Vector3(-0.74, 0.645, 0.095),
    new THREE.Vector3(-0.87, 0.64, 0.065),
  ];
  const path = new THREE.CatmullRomCurve3(sections);
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 24; i++) {
    const t = (lo + hi) / 2;
    if (path.getPoint(t).x > z) lo = t;
    else hi = t;
  }
  return path.getPoint((lo + hi) / 2);
}
/** Low elongated paw anatomy with a closed ankle seat and broad toe shelf; not a sphere pad. */
function houndPaw(f: Vec3): THREE.BufferGeometry {
  const sections = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.045, 0.07, 0.035),
    new THREE.Vector3(-0.005, 0.048, 0.086),
    new THREE.Vector3(-0.07, 0.038, 0.088),
    new THREE.Vector3(-0.105, 0.028, 0.068),
  ]);
  const p: number[] = [],
    uv: number[] = [],
    idx: number[] = [],
    rows = 6,
    sides = 12;
  for (let j = 0; j <= rows; j++) {
    const c = sections.getPoint(j / rows);
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const ry = j < 3 ? 0.038 : 0.03;
      const lateral = Math.sin(a) * c.z * (f[2] < 0 ? 1 : 0.93),
        toe = Math.cos(Math.PI * 2 * Math.sin(a)),
        front = Math.max(0, Math.min(1, (-c.x - 0.025) / 0.07));
      p.push(
        f[0] + lateral,
        f[1] + c.y + Math.cos(a) * ry + front * Math.max(0, Math.cos(a)) * 0.012 * toe,
        f[2] + c.x - front * 0.026 * (0.5 + 0.5 * toe),
      );
      uv.push(i / sides, j / rows);
      if (j < rows && i < sides) {
        const q = j * (sides + 1) + i;
        idx.push(q, q + 1, q + sides + 1, q + 1, q + sides + 2, q + sides + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return closeRings(g, sides);
}
function zombieDog(): THREE.Group {
  const k = new ZLKit();
  k.group.name = 'zombieDog';
  const body = k.part('hound-continuous-rump-nape-skull-muzzle', C.skin, houndBody());
  // Lean running anatomy: all four roots are deeply seated inside the trunk, no shoulder balls.
  const feet: Vec3[] = [
    [-0.18, 0.035, -0.69],
    [0.19, 0.035, -0.45],
    [-0.16, 0.035, 0.63],
    [0.19, 0.1, 0.46],
  ];
  for (let i = 0; i < 4; i++) {
    const front = i < 2,
      side = i % 2 === 0 ? -1 : 1,
      z = front ? -0.12 : 0.48;
    const f = feet[i];
    k.curve(
      `hound-${front ? 'front' : 'hind'}-continuous-leg-${side}`,
      C.skin,
      [
        [side * 0.045, 0.69, z],
        [side * 0.145, 0.53, z - 0.08],
        [f[0], 0.18, f[2] + 0.08],
        [f[0], f[1] + 0.08, f[2] + 0.02],
        [f[0], f[1] + 0.055, f[2]],
      ],
      [0.055, 0.082, 0.04, 0.035, 0.035],
      [0.065, 0.072, 0.035, 0.035, 0.025],
      10,
      8,
    );
    k.part('hound-integrated-low-paw-shell', C.skin, houndPaw(f));
    for (let toe = 0; toe < 3; toe++) {
      const x = f[0] + (toe - 1) * 0.062;
      k.curve(
        'hound-short-dark-claw',
        C.dark,
        [
          [x, f[1] + 0.028, f[2] - 0.078],
          [x, f[1] + 0.021, f[2] - 0.145],
        ],
        [0.013, 0.001],
        [0.009, 0.001],
        3,
        5,
      );
    }
  }
  k.curve(
    'hound-long-tapered-tail',
    C.skin,
    [
      [0, 0.73, 0.55],
      [0.05, 0.78, 0.8],
      [0.16, 0.91, 0.98],
      [0.18, 1.03, 1.02],
    ],
    [0.08, 0.065, 0.04, 0.001],
    undefined,
    12,
    8,
  );
  for (const side of [-1, 1]) {
    k.curve(
      'hound-long-drooped-ear',
      0x5d6247,
      [
        [side * 0.13, 0.78, -0.36],
        [side * 0.21, 0.7, -0.37],
        [side * 0.22, 0.56, -0.29],
        [side * 0.2, 0.45, -0.31],
      ],
      [0.07, 0.095, 0.08, 0.005],
      [0.027, 0.038, 0.025, 0.002],
      12,
      8,
    );
    // A seated globe is covered by a broad continuous skin lid, not an external socket bead.
    const seat = sideSurface(body, side, 0.705, -0.55, 0);
    const center: Vec3 = [seat[0] + side * 0.002, 0.705, -0.55];
    k.sphere(C.dark, center, [0.022, 0.019, 0.038], k.group, 8).name = 'hound-seated-eye-globe';
    const lp: number[] = [],
      lu: number[] = [],
      li: number[] = [];
    for (let ring = 0; ring < 3; ring++)
      for (let i = 0; i <= 16; i++) {
        const a = (i / 16) * Math.PI * 2,
          t = ring / 2;
        const dz = Math.cos(a) * (0.06 * (1 - t) + 0.026 * t);
        const dy = Math.sin(a) * (0.034 * (1 - t) + (Math.sin(a) > 0 ? 0.008 : 0.012) * t) + dz * 0.22;
        const surface = sideSurface(body, side, center[1] + dy, center[2] + dz, 0);
        const envelope =
          center[0] + side * (0.022 * Math.sqrt(Math.max(0.04, 1 - (dy / 0.019) ** 2 - (dz / 0.038) ** 2)) + 0.002);
        lp.push(surface[0] * (1 - t) + envelope * t, center[1] + dy, center[2] + dz);
        lu.push(i / 16, t);
        if (ring < 2 && i < 16) {
          const q = ring * 17 + i;
          if (side > 0) li.push(q, q + 17, q + 1, q + 1, q + 17, q + 18);
          else li.push(q, q + 1, q + 17, q + 1, q + 18, q + 17);
        }
      }
    const lid = new THREE.BufferGeometry();
    lid.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    lid.setAttribute('uv', new THREE.Float32BufferAttribute(lu, 2));
    lid.setIndex(li);
    lid.computeVertexNormals();
    k.part('hound-continuous-slanted-orbital-lid', C.skin, lid);
    k.sphere(0xc18b2c, [center[0] + side * 0.022, center[1], center[2]], [0.003, 0.009, 0.017], k.group, 8).name =
      'hound-inset-amber-iris';
    k.sphere(C.dark, [center[0] + side * 0.025, center[1], center[2]], [0.002, 0.007, 0.006], k.group, 6).name =
      'hound-seated-dark-pupil';
    k.curve(
      'hound-jaw-seam',
      C.dark,
      [
        sideSurface(body, side, 0.625, -0.86, 0.003),
        sideSurface(body, side, 0.615, -0.77, 0.003),
        sideSurface(body, side, 0.59, -0.62, 0.003),
      ],
      [0.004, 0.007, 0.002],
      undefined,
      9,
      5,
    );
  }
  k.body(
    'hound-leather-nose',
    C.dark,
    [
      [0.595, 0.035, 0.02, 0, -0.87],
      [0.62, 0.082, 0.035, 0, -0.875],
      [0.665, 0.077, 0.035, 0, -0.875],
      [0.69, 0.025, 0.012, 0, -0.87],
    ],
    7,
    12,
    'leather',
  );
  // Tailored saddle coat wraps dorsum; the open underside preserves the running tuck.
  const p: number[] = [],
    coatUV: number[] = [],
    idx: number[] = [];
  for (let j = 0; j <= 8; j++) {
    const z = 0.46 - j * 0.065,
      section = houndSection(z),
      rx = section.z + 0.025;
    for (let i = 0; i <= 12; i++) {
      const a = -Math.PI * 0.64 + (i / 12) * Math.PI * 1.28;
      p.push(Math.sin(a) * rx, section.y + Math.cos(a) * (section.z * 1.12 + 0.025), z);
      coatUV.push(i / 12, j / 8);
      if (j < 8 && i < 12) {
        const q = j * 13 + i;
        idx.push(q, q + 1, q + 13, q + 1, q + 14, q + 13);
      }
    }
  }
  const coatGeo = new THREE.BufferGeometry();
  coatGeo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  coatGeo.setAttribute('uv', new THREE.Float32BufferAttribute(coatUV, 2));
  coatGeo.setIndex(idx);
  coatGeo.computeVertexNormals();
  const coat = k.part('hound-tailored-patch-coat', C.coat, coatGeo, 'leather');
  (coat.material as THREE.Material).side = THREE.DoubleSide;
  const coatPoint = (z: number, a: number): Vec3 => {
    const section = houndSection(z);
    return [Math.sin(a) * (section.z + 0.031), section.y + Math.cos(a) * (section.z * 1.12 + 0.031), z];
  };
  for (const z of [0.33, -0.01]) {
    const pts: Vec3[] = [];
    for (let i = 0; i <= 8; i++) pts.push(coatPoint(z, -Math.PI * 0.64 + (i / 8) * Math.PI * 1.28));
    k.curve('hound-surface-fitted-coat-binding', C.edge, pts, new Array(9).fill(0.009), undefined, 14, 6);
    for (const side of [-1, 1])
      for (let n = 0; n < 3; n++) {
        const a = side * (0.6 + n * 0.3);
        k.curve(
          'hound-attached-cross-stitch',
          C.stitch,
          [coatPoint(z - 0.02, a - 0.045), coatPoint(z + 0.02, a + 0.045)],
          [0.005, 0.005],
          undefined,
          2,
          4,
        );
      }
  }
  const collar = k.torus(C.edge, [0, 0.735, -0.31], 0.161, 0.02, k.group, 'leather');
  collar.scale.y = 1.12;
  collar.name = 'hound-fitted-collar';
  k.box(C.brass, [0.17, 0.7, -0.31], [0.035, 0.065, 0.07], k.group, 0.008, 'metal').name = 'hound-collar-buckle';
  body.userData.concept = 'creature-v2-zombie-concept.png / upper middle';
  return fitCreature(k.group, false, 1.14);
}

function zombieHumanoid(kind: 'zombie' | 'giantZombie' | 'zombieKing'): THREE.Group {
  const k = new ZLKit(kind === 'zombie' ? 0.48 : 1);
  k.group.name = kind;
  const giant = kind === 'giantZombie',
    king = kind === 'zombieKing';
  const torso = k.part('single-continuous-torso-shoulders-arms', C.skin, buildDetailedZombieSkin(kind));
  const headStart = k.group.children.length;
  const authoredHead = authorZombieQuadFace(k, kind, C.skin);
  k.part('continuous-cropped-hair-scalp', 0x30342b, croppedZombieHair(kind === 'zombie', authoredHead));
  // Closed shallow concha and outer helix, not an applied flat oval disk.
  for (const side of [-1, 1]) {
    const p: number[] = [],
      uv: number[] = [],
      idx: number[] = [],
      n = 8;
    for (let ring = 0; ring < 3; ring++)
      for (let j = 0; j < n; j++) {
        const a = (j / n) * Math.PI * 2,
          radius = ring === 0 ? 1 : ring === 1 ? 0.66 : 0.18;
        p.push(
          side * (0.275 + (ring === 0 ? 0.018 : ring === 1 ? 0.065 : 0.03)),
          2.66 + Math.cos(a) * 0.105 * radius,
          0.015 + Math.sin(a) * 0.065 * radius,
        );
        uv.push(j / n, ring / 2);
        if (ring < 2) {
          const q = ring * n + j,
            next = ring * n + ((j + 1) % n);
          if (side > 0) idx.push(q, next, q + n, next, next + n, q + n);
          else idx.push(q, q + n, next, next, q + n, next + n);
        }
      }
    // Close both the concha floor and buried attachment root.
    const center = p.length / 3;
    p.push(side * 0.305, 2.66, 0.015);
    uv.push(0.5, 0.5);
    const back = p.length / 3;
    p.push(side * 0.26, 2.66, 0.015);
    uv.push(0.5, 0.5);
    for (let j = 0; j < n; j++) {
      const next = (j + 1) % n;
      if (side > 0) idx.push(2 * n + j, 2 * n + next, center, next, j, back);
      else idx.push(2 * n + next, 2 * n + j, center, j, next, back);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(idx);
    geometry.computeVertexNormals();
    k.part('sculpted-zombie-ear-concha', C.skin, geometry);
  }
  const head = new THREE.Group();
  head.name = 'distinct-hunched-zombie-head';
  const pieces = k.group.children.slice(headStart);
  for (const o of pieces) {
    head.add(o);
    o.position.y -= 2.65;
    o.position.z += 0.12;
  }
  head.position.set(0, giant ? 2.34 : king ? 2.54 : 2.49, giant ? -0.25 : king ? -0.19 : -0.23);
  head.scale.setScalar(giant ? 1.16 : king ? 1.03 : 1.12);
  head.scale.y *= 0.84;
  head.rotation.x = giant ? 0.03 : king ? 0.12 : 0.1;
  k.group.add(head);
  authorRaggedWrapVest(k, torso, kind === 'zombie', giant);
  for (const side of [-1, 1]) {
    const footZ = king ? (side < 0 ? -0.43 : 0.28) : side < 0 ? 0.11 : -0.02;
    k.curve(
      'continuous-trouser-leg',
      0x383830,
      [
        [side * 0.26, 0.94, 0],
        [side * 0.3, king ? (side < 0 ? 0.78 : 0.6) : 0.64, footZ + 0.05],
        [side * 0.34, 0.28, footZ],
        [side * 0.35, 0.16, footZ - 0.08],
      ],
      [0.23, 0.21, 0.17, 0.17],
      undefined,
      kind === 'zombie' ? 10 : 14,
      kind === 'zombie' ? 10 : 12,
    );
    const boot = k.body(
      'fitted-heavy-boot',
      C.coat,
      [
        [0.025, 0.21, 0.31, side * 0.35, footZ - 0.12],
        [0.08, 0.23, 0.34, side * 0.35, footZ - 0.13],
        [0.24, 0.2, 0.27, side * 0.35, footZ - 0.1],
        [0.39, 0.175, 0.18, side * 0.34, footZ],
      ],
      kind === 'zombie' ? 8 : 10,
      kind === 'zombie' ? 12 : 14,
      'leather',
    );
    const bootPositions = boot.geometry.attributes.position,
      bootColors: number[] = [];
    for (let i = 0; i < bootPositions.count; i++) {
      const y = bootPositions.getY(i),
        edge = Math.max(0, Math.min(1, (y - 0.075) / 0.045));
      const shade = 0.32 + 0.68 * edge;
      bootColors.push(shade, shade, shade);
    }
    boot.geometry.setAttribute('color', new THREE.Float32BufferAttribute(bootColors, 3));
    k.curve(
      'boot-sole-seam',
      C.dark,
      [
        [side * 0.35 - 0.19, 0.06, footZ - 0.12],
        [side * 0.35 - 0.12, 0.045, footZ - 0.39],
        [side * 0.35 + 0.12, 0.045, footZ - 0.39],
        [side * 0.35 + 0.19, 0.06, footZ - 0.12],
      ],
      [0.018, 0.018, 0.018, 0.018],
      undefined,
      kind === 'zombie' ? 6 : 10,
      kind === 'zombie' ? 4 : 5,
    );
    authorSeatedBootStraps(k, boot, side * 0.35, kind === 'zombie');
    const wrist: Vec3 = giant
      ? [side * 1.03, 0.2765, -0.34]
      : king
        ? side < 0
          ? [-0.77, 1.18, -0.63]
          : [0.85, 1.3, 0.05]
        : [side * 0.86, 0.8, -0.12];
    const handStart = k.group.children.length;
    k.curve(
      'integrated-fist-palm',
      C.skin,
      [
        [wrist[0], wrist[1] + 0.1, wrist[2]],
        [wrist[0], wrist[1] - 0.06, wrist[2] - 0.08],
        [wrist[0], wrist[1] - 0.12, wrist[2] - 0.1],
      ],
      [0.2, 0.25, 0.17],
      [0.22, 0.23, 0.16],
      kind === 'zombie' ? 6 : 10,
      kind === 'zombie' ? 10 : 12,
    );
    for (let f = 0; f < 4; f++) {
      const x = wrist[0] + (f - 1.5) * 0.105;
      k.curve(
        'curled-finger-knuckle',
        C.skin,
        [
          [x, wrist[1] + 0.015, wrist[2] - 0.15],
          [x, wrist[1] - 0.07, wrist[2] - 0.27],
          [x, wrist[1] - 0.135, wrist[2] - 0.08],
        ],
        [0.068, 0.075, 0.06],
        undefined,
        kind === 'zombie' ? 4 : 7,
        kind === 'zombie' ? 6 : 7,
      );
    }
    k.curve(
      'folded-opposing-thumb',
      C.skin,
      [
        [wrist[0] - side * 0.16, wrist[1] + 0.06, wrist[2] - 0.04],
        [wrist[0] - side * 0.245, wrist[1] - 0.04, wrist[2] - 0.13],
        [wrist[0] - side * 0.15, wrist[1] - 0.13, wrist[2] - 0.23],
      ],
      [0.07, 0.07, 0.04],
      undefined,
      kind === 'zombie' ? 6 : 8,
      kind === 'zombie' ? 7 : 8,
    );
    {
      const hand = new THREE.Group(),
        scale = giant ? 1.28 : 1.12;
      hand.name = 'powerful-curled-fist-hand';
      for (const o of k.group.children.slice(handStart)) {
        hand.add(o);
        o.position.sub(new THREE.Vector3(...wrist));
      }
      hand.scale.setScalar(scale);
      hand.position.set(...wrist);
      if (king) hand.rotation.x = side < 0 ? 0.8 : -0.12;
      k.group.add(hand);
      if (giant) {
        k.group.updateMatrixWorld(true);
        hand.position.y += new THREE.Box3().setFromObject(boot).min.y - new THREE.Box3().setFromObject(hand).min.y;
      }
    }
    const lapelXY: [number, number][] = [
      [side * 0.18, 2.2],
      [side * 0.36, 2.23],
      [side * 0.41, 2.08],
      [side * 0.27, 1.88],
      [side * 0.2, 2.04],
    ];
    const lapel = lapelXY.map(([x, y], i) => {
      const p = frontSurface(torso, x + (giant ? side * 0.13 : 0), y, 0.035);
      return [p[0], p[1], p[2] - (i === 2 || i === 3 ? 0.045 : 0.012)] as Vec3;
    });
    k.plate('folded-thick-leather-vest-lapel', C.coat, lapel, 0.024, 'leather');
    for (const y of giant ? [1.4, 1.78, 2.07] : []) {
      const p = frontSurface(torso, side * (giant ? 0.36 + Math.max(0, y - 1.95) * 0.65 : 0.25), y, 0.06);
      k.sphere(C.brass, p, [0.027, 0.027, 0.012], k.group, kind === 'zombie' ? 5 : 8, 'metal').name = 'vest-rivet';
    }
  }
  if (giant) {
    const organ = k.body(
      'single-connected-lobed-charged-throat',
      0x9fbc37,
      [
        [1.42, 0.18, 0.08, 0, -0.25],
        [1.58, 0.31, 0.2, -0.025, -0.3],
        [1.8, 0.36, 0.21, 0.025, -0.28],
        [2.0, 0.34, 0.17, -0.015, -0.23],
        [2.18, 0.33, 0.14, 0, -0.18],
      ],
      14,
      16,
      'glow',
    );
    const op = organ.geometry.attributes.position,
      organColors: number[] = [];
    for (let i = 0; i < op.count; i++) {
      const x = op.getX(i),
        y = op.getY(i),
        z = op.getZ(i);
      const front = Math.max(0, Math.min(1, (-z - 0.19) / 0.16));
      const lobe =
        0.1 * Math.exp(-Math.pow((x + 0.16) / 0.17, 2) - Math.pow((y - 1.94) / 0.16, 2)) +
        0.09 * Math.exp(-Math.pow((x - 0.16) / 0.16, 2) - Math.pow((y - 1.75) / 0.18, 2)) +
        0.065 * Math.exp(-Math.pow((x + 0.07) / 0.18, 2) - Math.pow((y - 1.56) / 0.13, 2));
      op.setZ(i, z - front * lobe);
      op.setX(i, x + front * 0.012 * Math.sin(y * 11));
      const shade = 0.87 + 0.13 * Math.min(1, lobe / 0.1);
      organColors.push(shade * 0.96, shade, shade * 0.93);
    }
    organ.geometry.setAttribute('color', new THREE.Float32BufferAttribute(organColors, 3));
    organ.geometry.computeVertexNormals();
    organ.material = new THREE.MeshPhysicalMaterial({
      color: 0x648c1f,
      vertexColors: true,
      roughness: 0.38,
      metalness: 0,
      clearcoat: 0.2,
      clearcoatRoughness: 0.18,
      transmission: 0.12,
      thickness: 0.12,
      emissive: 0x334808,
      emissiveIntensity: 0.16,
    });
    k.group.updateMatrixWorld(true);
    const mouthCorner = frontSurface(authoredHead, 0.2, 2.24, 0.002);
    k.curve(
      'contained-slime-mouth-drop',
      0x9fbc37,
      [
        mouthCorner,
        [mouthCorner[0] + 0.012, mouthCorner[1] - 0.045, mouthCorner[2] - 0.004],
        [mouthCorner[0] + 0.008, mouthCorner[1] - 0.09, mouthCorner[2]],
      ],
      [0.015, 0.018, 0.001],
      undefined,
      7,
      6,
      'glow',
    );
  }
  if (king) {
    const crownStart = k.group.children.length;
    k.body(
      'royal-crown-band',
      C.brass,
      [
        [2.87, 0.27, 0.23, 0, -0.11],
        [2.99, 0.29, 0.24, 0, -0.11],
      ],
      3,
      18,
      'metal',
    );
    for (const side of [-1, 0, 1])
      k.plate(
        'three-point-royal-crown',
        C.brass,
        [
          [side * 0.21 - 0.07, 2.94, -0.35],
          [side * 0.21 + 0.07, 2.94, -0.35],
          [side * 0.21 + 0.045, 3.13, -0.34],
          [side * 0.21, 3.23 + (side === 0 ? 0.09 : 0), -0.32],
          [side * 0.21 - 0.045, 3.13, -0.34],
        ],
        0.045,
        'metal',
      );
    for (const crown of k.group.children.slice(crownStart)) {
      head.add(crown);
      crown.position.y -= 2.65;
      crown.position.z += 0.12;
    }
    authorFoldedMantleCollar(k);
    authorRoyalCape(k);
    const belt = frontSurface(torso, 0, 1.15, 0.06);
    k.box(C.coat, belt, [0.67, 0.15, 0.05], k.group, 0.025, 'leather').name = 'royal-waist-belt';
    k.plate(
      'large-royal-belt-buckle',
      C.brass,
      [
        [-0.13, 1.25, belt[2] - 0.04],
        [0.13, 1.25, belt[2] - 0.04],
        [0.16, 1.13, belt[2] - 0.04],
        [0.1, 1.04, belt[2] - 0.04],
        [-0.1, 1.04, belt[2] - 0.04],
        [-0.16, 1.13, belt[2] - 0.04],
      ],
      0.025,
      'metal',
    );
    authorGravePauldron(k);
    k.torus(C.brass, [0.32, 2.13, -0.38], 0.085, 0.025, k.group, 'metal').name = 'mantle-functional-clasp';
  }
  if (king) leanRoyalCharge(k.group);
  if (kind === 'zombie') leanWorkerHunch(k.group);
  k.group.userData.concept = 'creature-v2-zombie-concept.png';
  return fitCreature(k.group, kind !== 'zombie', kind === 'zombie' ? 1.28 : 3.12);
}

function crow(): THREE.Group {
  const k = new ZLKit();
  k.group.name = 'crow';
  const feather = 0x252d39;
  const crowHead = k.curve(
    'crow-continuous-keel-neck-head',
    feather,
    [
      [0, -0.13, 0.28],
      [0, 0.02, 0.06],
      [0, 0.19, -0.16],
      [0, 0.2, -0.32],
    ],
    [0.01, 0.16, 0.12, 0.055],
    [0.01, 0.12, 0.11, 0.055],
    18,
    12,
  );
  const cp = crowHead.geometry.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i),
      y = cp.getY(i),
      z = cp.getZ(i);
    const ridge = Math.exp(
      -Math.pow((Math.abs(x) - 0.09) / 0.04, 2) - Math.pow((y - 0.255) / 0.025, 2) - Math.pow((z + 0.24) / 0.065, 2),
    );
    cp.setY(i, y + 0.009 * ridge);
  }
  crowHead.geometry.computeVertexNormals();
  k.curve(
    'crow-hooked-beak',
    0x4c5359,
    [
      [0, 0.2, -0.28],
      [0, 0.19, -0.43],
      [0, 0.12, -0.5],
    ],
    [0.075, 0.045, 0.001],
    [0.05, 0.03, 0.001],
    8,
    8,
  );
  for (const side of [-1, 1]) {
    const eyeSeat = sideSurface(crowHead, side, 0.23, -0.24, 0);
    k.sphere(0x9f6a22, [eyeSeat[0] - side * 0.006, 0.23, -0.24], [0.009, 0.006, 0.016], k.group, 8).name =
      'crow-focused-inset-lateral-eye';
    k.sphere(0x10171c, [eyeSeat[0] + side * 0.003, 0.229, -0.244], [0.002, 0.004, 0.006], k.group, 6).name =
      'crow-seated-dark-pupil';
    for (let f = 0; f < 4; f++)
      k.curve(
        'crow-layered-secondary-covert',
        0x333d4a,
        [
          [side * 0.12, 0.09, 0.01],
          [side * (0.21 + f * 0.07), side < 0 ? 0.39 : 0.23, 0.08 + f * 0.035],
          [side * (0.33 + f * 0.065), side < 0 ? 0.46 + f * 0.025 : 0.29 + f * 0.025, 0.25 + f * 0.045],
        ],
        [0.028, 0.048, 0.002],
        [0.018, 0.018, 0.001],
        7,
        6,
      );
    for (let toe = 0; toe < 3; toe++)
      k.curve(
        'crow-curled-talon-toe',
        0x4c5359,
        [
          [side * 0.1, -0.18, 0.03],
          [side * 0.1 + (toe - 1) * 0.025, -0.215, -0.055],
          [side * 0.1 + (toe - 1) * 0.035, -0.19, -0.085],
        ],
        [0.009, 0.008, 0.001],
        undefined,
        5,
        5,
      );
    for (let f = 0; f < 6; f++) {
      const x = side * (0.6 - f * 0.02),
        z = 0.1 + f * 0.03;
      k.curve(
        'crow-layered-flight-feather',
        f % 2 ? 0x333d4a : feather,
        [
          [side * 0.38, side < 0 ? 0.35 : 0.22, 0.08],
          [x, side < 0 ? 0.6 - f * 0.07 : 0.42 - f * 0.065, z],
          [side * (0.9 - f * 0.035), side < 0 ? 0.85 - f * 0.13 : 0.6 - f * 0.12, 0.15 + f * 0.05],
        ],
        [0.045, 0.07, 0.001],
        [0.025, 0.025, 0.001],
        9,
        6,
      );
    }
    k.curve(
      'crow-wing-leading-edge',
      feather,
      [
        [side * 0.07, 0.07, 0],
        [side * 0.34, side < 0 ? 0.4 : 0.24, -0.02],
        [side * 0.59, side < 0 ? 0.6 : 0.39, 0.13],
      ],
      [0.09, 0.07, 0.015],
      undefined,
      10,
      8,
    );
    k.curve(
      'crow-tucked-leg',
      0x4c5359,
      [
        [side * 0.07, -0.06, 0.08],
        [side * 0.09, -0.19, 0.03],
        [side * 0.12, -0.21, -0.03],
      ],
      [0.02, 0.016, 0.007],
      undefined,
      6,
      5,
    );
  }
  for (let i = 0; i < 4; i++)
    k.curve(
      'crow-tail-fan',
      feather,
      [
        [0, -0.07, 0.19],
        [(i - 1.5) * 0.06, -0.13, 0.4],
        [(i - 1.5) * 0.1, -0.14, 0.56],
      ],
      [0.045, 0.06, 0.001],
      [0.02, 0.02, 0.001],
      8,
      6,
    );
  return fitCreature(k.group, false, 0.85);
}
export function buildZombieMonster(id: string, _color: number): THREE.Group | undefined {
  const group =
    id === 'zombieDog' ? zombieDog() : id === 'zombie' ? zombieHumanoid('zombie') : id === 'crow' ? crow() : undefined;
  if (group) applyZombieRuntimeMaterials(group, id);
  return group;
}
export function buildZombieBoss(id: string): THREE.Group | undefined {
  const group = id === 'giantZombie' || id === 'zombieKing' ? zombieHumanoid(id) : undefined;
  if (group) applyZombieRuntimeMaterials(group, id);
  return group;
}
