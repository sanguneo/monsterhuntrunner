import * as THREE from 'three';
import type { Vec3 } from '../../ModelKit';
import { SeaSkullKit } from './sea-skull-kit';
import { createAuthoredSkullGeometry } from './skull-authored-geometry';
import { createSkullBakedMaterial } from './skull-baked-surfaces';
import { dressSkullBody } from './skull-surface-art';
import { createAuthoredBirdSkull } from './skull-bird-authored-geometry';
const BONE = 0xd8cdb1,
  DARK = 0x48505c,
  CLOTH = 0x55405f,
  GOLD = 0xa4824d;

function skullFace(k: SeaSkullKit, center: Vec3, s: number, wide = 1): void {
  const [x, y, z] = center,
    lod = s >= 0.8 ? 'boss' : 'mob';
  const [bone, cavity] = createAuthoredSkullGeometry(lod);
  for (const geometry of [bone, cavity]) geometry.scale(s * wide, s, s).translate(x, y, z);
  const material = createSkullBakedMaterial(lod);
  const cortex = new THREE.Mesh(bone, material),
    interior = new THREE.Mesh(cavity, createSkullBakedMaterial(lod, true));
  cortex.name = 'sculpted-skull-with-recessed-orbits';
  interior.name = 'actual-concave-orbital-nasal-oral-surfaces';
  k.group.add(cortex, interior);
  for (const side of [-1, 1])
    k.mesh(
      new THREE.SphereGeometry(1, 8, 4),
      0xd8a553,
      [x + side * 0.095 * s * wide, y + 0.035 * s, z - 0.096 * s],
      [0.017 * s, 0.023 * s, 0.011 * s],
      k.group,
      'glow',
    ).name = 'recessed-orbital-wisp';
}
function fingerHand(k: SeaSkullKit, p: Vec3, s: number, down = true): void {
  const [x, y, z] = p;
  k.closedLoft(
    BONE,
    [
      [y - 0.09 * s, 0.055 * s, 0.035 * s, x, z],
      [y + 0.08 * s, 0.065 * s, 0.04 * s, x, z],
    ],
    6,
    8,
  );
  for (let i = 0; i < 4; i++) {
    const px = x + (i - 1.5) * 0.035 * s,
      dy = down ? -1 : 1;
    k.limb(
      BONE,
      [
        [px, y - 0.05 * s, z],
        [px, y + dy * 0.14 * s, z - 0.03 * s],
        [px, y + dy * 0.18 * s, z - 0.1 * s],
      ],
      [0.018 * s, 0.015 * s, 0.007 * s],
      undefined,
      6,
      5,
    );
  }
  k.limb(
    BONE,
    [
      [x - 0.055 * s, y + 0.025 * s, z],
      [x - 0.1 * s, y - 0.04 * s, z - 0.04 * s],
      [x - 0.07 * s, y - 0.09 * s, z - 0.1 * s],
    ],
    [0.025 * s, 0.02 * s, 0.009 * s],
    undefined,
    6,
    5,
  );
}
function ribcage(k: SeaSkullKit, c: Vec3, s: number, width: number, articulated = false): void {
  const [x, y, z] = c;
  if (articulated) {
    // A continuous lumbar/thoracic/cervical chain, not a capped pole behind the ribs.
    // Radius modulation expresses vertebral bodies without disconnected bead joints.
    const profiles: [number, number, number, number, number][] = [];
    for (let row = 0; row <= 22; row++) {
      const t = row / 22,
        yv = -0.065 + t * 0.515;
      const zv =
        t < 0.25
          ? THREE.MathUtils.lerp(-0.065, 0.065, t / 0.25)
          : t < 0.7
            ? 0.065 + 0.008 * Math.sin(((t - 0.25) / 0.45) * Math.PI)
            : 0.065 - (t - 0.7) * 0.29;
      const r = (0.023 + 0.008 * Math.pow(Math.cos(t * Math.PI * 7), 2)) * (t > 0.88 ? 0.84 : 1);
      profiles.push([yv, r, r * 0.82, 0, zv]);
    }
    k.closedLoft(BONE, profiles, 22, 6).name = 'continuous-articulated-spine-pelvis-to-occiput';
  } else {
    k.limb(
      BONE,
      [
        [x, y - 0.24 * s, z + 0.06 * s],
        [x, y + 0.28 * s, z + 0.07 * s],
      ],
      [0.04 * s, 0.05 * s],
      undefined,
      9,
      8,
    ).name = 'central-spinal-column';
  }
  k.limb(
    BONE,
    [
      [x, y - 0.18 * s, z - 0.15 * s],
      [x, y + 0.25 * s, z - 0.18 * s],
    ],
    [0.026 * s, 0.055 * s],
    undefined,
    9,
    8,
  ).name = 'sternum';
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++)
      k.limb(
        BONE,
        [
          [x, y + (0.21 - i * 0.105) * s, z - 0.17 * s],
          [x + side * width * 0.76, y + (0.22 - i * 0.105) * s, z - 0.12 * s],
          [x + side * width, y + (0.16 - i * 0.105) * s, z + 0.025 * s],
          [x + side * width * 0.55, y + (0.16 - i * 0.105) * s, z + 0.13 * s],
          [x, y + (0.18 - i * 0.105) * s, z + 0.08 * s],
        ],
        [0.025 * s, 0.035 * s, 0.035 * s, 0.03 * s, 0.023 * s],
        [0.016 * s, 0.022 * s, 0.022 * s, 0.019 * s, 0.015 * s],
        12,
        6,
      ).name = 'open-negative-space-rib';
}
/** Surface-authored closed armor shell: sampled curvature, physical thickness, no decal. */
function fittedArmor(
  k: SeaSkullKit,
  body: THREE.Mesh,
  color: number,
  outline: [number, number][],
  clearance = 0.018,
  subdivisions = 2,
  relief = 0,
): THREE.Mesh {
  const mesh = k.patch(
    body,
    color,
    outline,
    'z',
    -1,
    clearance,
    color === BONE ? 'cloth' : 'metal',
    subdivisions,
    relief,
  );
  const source = mesh.geometry,
    p = source.getAttribute('position'),
    tex = source.getAttribute('uv');
  const front = Array.from(source.index!.array);
  let nz = 0;
  for (let i = 0; i < front.length; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(p, front[i]),
      b = new THREE.Vector3().fromBufferAttribute(p, front[i + 1]),
      c = new THREE.Vector3().fromBufferAttribute(p, front[i + 2]);
    nz += b.sub(a).cross(c.sub(a)).z;
  }
  if (nz > 0) for (let i = 0; i < front.length; i += 3) [front[i + 1], front[i + 2]] = [front[i + 2], front[i + 1]];
  const positions = Array.from(p.array),
    uv = Array.from(tex.array),
    n = p.count;
  for (let i = 0; i < n; i++) {
    positions.push(p.getX(i), p.getY(i), p.getZ(i) + 0.009);
    uv.push(tex.getX(i), tex.getY(i));
  }
  const indices = [...front],
    edges = new Map<string, { a: number; b: number; count: number }>();
  for (let i = 0; i < front.length; i += 3) {
    indices.push(front[i] + n, front[i + 2] + n, front[i + 1] + n);
    for (let j = 0; j < 3; j++) {
      const a = front[i + j],
        b = front[i + ((j + 1) % 3)],
        key = Math.min(a, b) + ':' + Math.max(a, b);
      const e = edges.get(key);
      if (e) e.count++;
      else edges.set(key, { a, b, count: 1 });
    }
  }
  for (const { a, b, count } of edges.values()) if (count === 1) indices.push(a, b + n, b, a, a + n, b + n);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  source.dispose();
  mesh.geometry = g;
  (mesh.material as THREE.Material).side = THREE.FrontSide;
  return mesh;
}

function boneGolem(): THREE.Group {
  const k = new SeaSkullKit();
  k.group.name = 'v2-boneGolem';
  // Compact armored rib tank. The braced knuckles, not dangling fingers, carry its weight.
  k.closedLoft(
    DARK,
    [
      [-0.06, 0.14, 0.1, 0, 0.06],
      [0.12, 0.25, 0.14, 0, 0.055],
      [0.34, 0.25, 0.13, 0, 0.05],
      [0.43, 0.12, 0.08, 0, 0.04],
    ],
    6,
    8,
  ).name = 'recessed-armored-thorax-core';
  skullFace(k, [0, 0.39, -0.17], 0.56, 1.1);
  for (const side of [-1, 1]) {
    for (let rib = 0; rib < 3; rib++) {
      const y = 0.28 - rib * 0.145;
      const mass = 1.12 - rib * 0.09;
      k.limb(
        BONE,
        [
          [0, y - 0.1, -0.2],
          [side * 0.22, y - 0.035, -0.21],
          [side * 0.37, y + 0.1, -0.09],
          [side * 0.3, y + 0.14, 0.1],
          [0, y + 0.08, 0.14],
        ],
        [0.034, 0.047, 0.054, 0.044, 0.028].map((r) => r * mass),
        [0.025, 0.032, 0.035, 0.028, 0.022],
        10,
        6,
      ).name = 'enclosing-curved-rib-arc';
    }
    k.limb(
      BONE,
      [
        [side * 0.12, 0.32, -0.09],
        [side * 0.24, 0.57, -0.045],
        [side * 0.43, 0.61, 0.015],
        [side * 0.53, 0.43, 0.045],
      ],
      [0.045, 0.095, 0.09, 0.025],
      [0.035, 0.055, 0.05, 0.018],
      12,
      8,
    ).name = 'massive-scapular-crown';
    const pauldron = k.closedLoft(
      DARK,
      [
        [0.18, 0.12, 0.11, side * 0.46, 0.01],
        [0.31, 0.18, 0.14, side * 0.46, 0.015],
        [0.43, 0.16, 0.12, side * 0.43, 0.02],
        [0.49, 0.065, 0.06, side * 0.39, 0.025],
      ],
      8,
      8,
      'metal',
    );
    pauldron.name = 'heavy-enclosing-pauldron';
    fittedArmor(
      k,
      pauldron,
      BONE,
      [
        [side * 0.35, 0.39],
        [side * 0.43, 0.435],
        [side * 0.565, 0.36],
        [side * 0.57, 0.27],
        [side * 0.46, 0.29],
        [side * 0.35, 0.31],
      ],
      0.022,
      2,
      0.016,
    ).name = 'fitted-layered-scapular-bone-shell';
    k.limb(
      BONE,
      [
        [side * 0.46, 0.27, 0.0],
        [side * 0.54, 0.03, -0.03],
        [side * 0.55, -0.29, -0.1],
        [side * 0.53, -0.47, -0.16],
      ],
      [0.085, 0.11, 0.11, 0.09],
      [0.07, 0.085, 0.08, 0.075],
      10,
      7,
    ).name = 'braced-heavy-arm';
    k.closedLoft(
      DARK,
      [
        [-0.43, 0.1, 0.085, side * 0.54, -0.13],
        [-0.32, 0.15, 0.115, side * 0.56, -0.09],
        [-0.09, 0.15, 0.11, side * 0.55, -0.045],
        [0.02, 0.1, 0.075, side * 0.53, -0.025],
      ],
      8,
      8,
      'metal',
    ).name = 'full-depth-forearm-armor';
    k.blade(
      BONE,
      [
        [side * 0.43, -0.08, -0.15],
        [side * 0.55, 0.015, -0.13],
        [side * 0.68, -0.11, -0.14],
        [side * 0.64, -0.34, -0.22],
        [side * 0.54, -0.43, -0.25],
        [side * 0.44, -0.31, -0.23],
      ],
      [0, 0, -1],
      0.035,
    ).name = 'broad-forearm-bone-carapace';
    k.closedLoft(
      BONE,
      [
        [-0.61, 0.09, 0.07, side * 0.53, -0.17],
        [-0.55, 0.13, 0.1, side * 0.53, -0.18],
        [-0.44, 0.12, 0.085, side * 0.53, -0.17],
        [-0.4, 0.07, 0.05, side * 0.53, -0.15],
      ],
      6,
      8,
    ).name = 'substantial-knuckle-palm';
    for (let finger = 0; finger < 4; finger++) {
      const x = side * 0.53 + (finger - 1.5) * 0.052;
      k.limb(
        BONE,
        [
          [x, -0.46, -0.235],
          [x, -0.54, -0.29],
          [x, -0.615, -0.25],
          [x, -0.6, -0.18],
        ],
        [0.029, 0.033, 0.028, 0.017],
        undefined,
        7,
        6,
      ).name = 'curled-load-bearing-finger';
    }
    k.limb(
      BONE,
      [
        [side * 0.42, -0.46, -0.16],
        [side * 0.4, -0.54, -0.23],
        [side * 0.46, -0.57, -0.27],
      ],
      [0.037, 0.031, 0.015],
      undefined,
      8,
      6,
    ).name = 'braced-fist-thumb';
    k.limb(
      BONE,
      [
        [side * 0.15, -0.1, 0.04],
        [side * 0.26, -0.32, 0.015],
        [side * 0.25, -0.52, -0.08],
      ],
      [0.09, 0.1, 0.075],
      undefined,
      9,
      7,
    );
    k.closedLoft(
      DARK,
      [
        [-0.52, 0.09, 0.075, side * 0.25, -0.08],
        [-0.36, 0.12, 0.09, side * 0.26, 0.005],
        [-0.24, 0.095, 0.075, side * 0.25, 0.015],
      ],
      8,
      8,
      'metal',
    ).name = 'heavy-greave';
    k.closedLoft(
      BONE,
      [
        [-0.65, 0.1, 0.13, side * 0.25, -0.15],
        [-0.59, 0.14, 0.16, side * 0.25, -0.15],
        [-0.49, 0.09, 0.085, side * 0.25, -0.1],
      ],
      6,
      8,
    ).name = 'broad-supporting-bone-foot';
    for (let toe = 0; toe < 3; toe++)
      k.limb(
        BONE,
        [
          [side * 0.25 + (toe - 1) * 0.055, -0.59, -0.22],
          [side * 0.25 + (toe - 1) * 0.055, -0.63, -0.31],
        ],
        [0.028, 0.02],
        undefined,
        4,
        5,
      );
  }
  k.blade(
    BONE,
    [
      [0, 0.38, -0.23],
      [0.075, 0.27, -0.24],
      [0.045, 0.06, -0.23],
      [0, -0.12, -0.17],
      [-0.045, 0.06, -0.23],
      [-0.075, 0.27, -0.24],
    ],
    [0, 0, -1],
    0.045,
  ).name = 'chunky-keel-sternum';
  k.blade(
    BONE,
    [
      [-0.22, -0.09, -0.12],
      [0, -0.23, -0.16],
      [0.22, -0.09, -0.12],
      [0.16, 0.02, -0.13],
      [-0.16, 0.02, -0.13],
    ],
    [0, 0, -1],
    0.045,
  );
  return k.group;
}
function soldier(): THREE.Group {
  const k = new SeaSkullKit();
  k.group.name = 'v2-skeletonSoldier';
  ribcage(k, [0, 0.19, 0.015], 0.65, 0.16, true);
  skullFace(k, [0, 0.49, -0.04], 0.54, 0.9);
  k.closedLoft(
    DARK,
    [
      [0.55, 0.113, 0.105, 0, -0.015],
      [0.61, 0.12, 0.1, 0, -0.005],
      [0.68, 0.015, 0.025, 0, 0.01],
    ],
    12,
    14,
    'metal',
  ).name = 'fitted-charger-helmet';
  k.limb(
    CLOTH,
    [
      [-0.13, 0.33, 0.01],
      [0, 0.3, -0.14],
      [0.15, 0.35, 0],
    ],
    [0.035, 0.045, 0.03],
    undefined,
    12,
    8,
  );
  k.blade(
    BONE,
    [
      [-0.13, -0.02, -0.07],
      [0, -0.11, -0.1],
      [0.13, -0.02, -0.07],
      [0.1, 0.07, -0.06],
      [-0.1, 0.07, -0.06],
    ],
    [0, 0, -1],
    0.035,
  );
  for (let toe = 0; toe < 3; toe++)
    k.limb(
      BONE,
      [
        [0.14 + (toe - 1) * 0.024, -0.6, -0.25],
        [0.14 + (toe - 1) * 0.026, -0.615, -0.35],
      ],
      [0.014, 0.011],
      undefined,
      6,
      6,
    );
  const legs: Vec3[][] = [
    [
      [0.08, -0.06, 0.0],
      [0.18, -0.28, -0.12],
      [0.14, -0.55, -0.18],
      [0.14, -0.6, -0.27],
    ],
    [
      [-0.08, -0.06, 0.02],
      [-0.18, -0.25, 0.18],
      [-0.13, -0.43, 0.32],
      [-0.15, -0.47, 0.19],
    ],
  ];
  for (const points of legs) {
    k.limb(BONE, points, [0.038, 0.042, 0.031, 0.035], undefined, 12, 8);
    const a = points[1],
      b = points[2];
    k.limb(DARK, [a, [b[0], b[1], b[2] - 0.025]], [0.057, 0.043], undefined, 9, 8, 'metal');
  }
  for (const side of [-1, 1]) {
    const hand: Vec3 = side < 0 ? [-0.36, 0.08, -0.18] : [0.3, 0.03, -0.08];
    k.limb(
      BONE,
      [[side * 0.16, 0.29, 0.01], [side * 0.27, 0.17, -0.015], hand],
      [0.032, 0.035, 0.025],
      undefined,
      15,
      8,
    );
    if (side > 0) fingerHand(k, hand, 0.45);
    else {
      k.limb(
        BONE,
        [
          [-0.37, 0.04, -0.165],
          [-0.34, 0.12, -0.165],
        ],
        [0.027, 0.026],
        [0.017, 0.016],
        7,
        7,
      );
      for (let f = 0; f < 4; f++)
        k.limb(
          BONE,
          [
            [-0.39 + f * 0.01, 0.025 + f * 0.023, -0.17],
            [-0.4 + f * 0.01, 0.025 + f * 0.023, -0.22],
            [-0.35 + f * 0.01, 0.025 + f * 0.023, -0.235],
          ],
          [0.009, 0.011, 0.006],
          undefined,
          7,
          6,
        );
      k.limb(
        BONE,
        [
          [-0.32, 0.11, -0.17],
          [-0.34, 0.055, -0.225],
          [-0.38, 0.06, -0.22],
        ],
        [0.014, 0.012, 0.005],
        undefined,
        7,
        6,
      );
    }
    k.blade(
      DARK,
      [
        [side * 0.11, 0.32, 0],
        [side * 0.22, 0.34, 0.02],
        [side * 0.27, 0.26, -0.02],
        [side * 0.15, 0.24, -0.06],
      ],
      [0, 0, -1],
      0.025,
      'metal',
    );
  }
  k.limb(
    GOLD,
    [
      [-0.4, 0.0, -0.19],
      [-0.31, 0.17, -0.19],
    ],
    [0.025, 0.025],
    undefined,
    7,
    8,
    'metal',
  );
  k.blade(
    0xb6bbc0,
    [
      [-0.34, 0.14, -0.19],
      [-0.55, 0.47, -0.22],
      [-0.65, 0.55, -0.22],
      [-0.61, 0.42, -0.21],
      [-0.4, 0.1, -0.19],
    ],
    [0, 0, -1],
    0.014,
    'metal',
  );
  k.limb(
    GOLD,
    [
      [-0.43, 0.12, -0.2],
      [-0.3, 0.08, -0.2],
    ],
    [0.018, 0.018],
    undefined,
    6,
    6,
    'metal',
  );
  k.blade(
    GOLD,
    [
      [-0.018, 0.65, -0.055],
      [0, 0.69, -0.01],
      [0.018, 0.65, -0.055],
      [0.016, 0.54, -0.12],
      [0, 0.5, -0.13],
      [-0.016, 0.54, -0.12],
    ],
    [0, 0, -1],
    0.008,
    'metal',
  ).name = 'charger-helmet-nasal-ridge';
  for (const side of [-1, 1]) {
    k.blade(
      GOLD,
      [
        [side * 0.015, 0.565, -0.12],
        [side * 0.1, 0.59, -0.09],
        [side * 0.115, 0.55, -0.08],
        [side * 0.02, 0.54, -0.125],
      ],
      [0, 0, -1],
      0.006,
      'metal',
    ).name = 'charger-helmet-orbit-rim';
    k.blade(
      CLOTH,
      [
        [side * 0.08, 0.015, 0.01],
        [side * 0.15, -0.02, 0.025],
        [side * 0.18, -0.24, 0.09],
        [side * 0.08, -0.18, 0.06],
      ],
      [0, 0, -1],
      0.008,
    ).name = 'charger-tattered-hip-cloth';
  }
  return k.group;
}
function skullBird(): THREE.Group {
  const k = new SeaSkullKit();
  k.group.name = 'v2-skullBird';
  k.limb(
    BONE,
    [
      [0, 0.16, -0.31],
      [0, 0.09, -0.18],
      [0, -0.03, 0.2],
      [0, -0.04, 0.4],
    ],
    [0.05, 0.075, 0.06, 0.015],
    undefined,
    18,
    10,
  );
  const [avianBone, avianCavity] = createAuthoredBirdSkull();
  k.mesh(avianBone, BONE).name = 'authored-avian-skull-with-hooked-beak';
  k.mesh(avianCavity, 0x1c1b26).name = 'true-avian-orbital-and-nasal-cavities';
  for (const side of [-1, 1])
    k.sphere(0x9564ba, [side * 0.068, 0.183, -0.327], [0.01, 0.012, 0.015], k.group, 8, 'glow').name =
      'recessed-avian-orbit-glow';
  for (const side of [-1, 1]) {
    k.limb(
      BONE,
      [
        [side * 0.04, 0.07, -0.15],
        [side * 0.27, 0.17, 0.04],
        [side * 0.43, 0.36, -0.015],
        [side * 0.7, 0.34, 0.16],
      ],
      [0.045, 0.035, 0.025, 0.006],
      undefined,
      15,
      8,
    ).name = 'connected-wing-bone';
    const wingCurve = new THREE.CatmullRomCurve3(
      [
        [side * 0.04, 0.07, -0.15],
        [side * 0.27, 0.17, 0.04],
        [side * 0.43, 0.36, -0.015],
        [side * 0.7, 0.34, 0.16],
      ].map((p) => new THREE.Vector3(...p)),
      false,
      'centripetal',
    );
    for (let i = 0; i < 7; i++) {
      const root = wingCurve.getPointAt(0.12 + i * 0.12),
        x = root.x,
        y = root.y,
        z = root.z;
      const points: Vec3[] = [
        [x, y, z],
        [x + side * 0.055, y - 0.1, z + 0.04],
        [x + side * 0.1, y - 0.18 - i * 0.013, z + 0.09],
        [x + side * (0.12 + i * 0.014), y - 0.28 - i * 0.035, z + 0.17],
      ];
      k.planarFeather(
        i % 2 ? 0x51435e : 0x66546e,
        points,
        [0.018, 0.07, 0.055, 0.001],
        [0.006, 0.009, 0.007, 0.001],
        8,
        6,
      ).name = 'rooted-curved-flight-vane';
      k.limb(
        BONE,
        [
          [x, y, z - 0.012],
          [x + side * 0.055, y - 0.1, z + 0.025],
          [x + side * 0.14, y - 0.24, z + 0.074],
        ],
        [0.014, 0.01, 0.002],
        undefined,
        4,
        5,
      ).name = 'connected-feather-quill';
    }
    for (let covert = 0; covert < 3; covert++) {
      const root = wingCurve.getPointAt(0.28 + covert * 0.22);
      k.planarFeather(
        BONE,
        [
          [root.x, root.y + 0.015, root.z - 0.02],
          [root.x + side * 0.03, root.y - 0.055, root.z - 0.025],
          [root.x + side * 0.06, root.y - 0.13, root.z - 0.005],
        ],
        [0.015, 0.033, 0.001],
        [0.008, 0.01, 0.001],
        4,
        5,
      ).name = 'wing-bone-covert';
    }
    for (let i = 0; i < 3; i++)
      k.limb(
        BONE,
        [
          [side * 0.035, 0.12 - i * 0.07, -0.16],
          [side * 0.16, 0.045 - i * 0.05, -0.075],
          [side * 0.08, -0.045 - i * 0.035, 0.08],
        ],
        [0.017, 0.021, 0.013],
        undefined,
        10,
        6,
      );
    k.limb(
      BONE,
      [
        [side * 0.06, -0.03, 0.05],
        [side * 0.08, -0.15, 0.03],
        [side * 0.1, -0.2, -0.05],
      ],
      [0.019, 0.018, 0.012],
      undefined,
      8,
      6,
    );
    for (let i = 0; i < 3; i++)
      k.limb(
        0x50464f,
        [
          [side * 0.1, -0.2, -0.04],
          [side * 0.1 + (i - 1) * 0.035, -0.23, -0.12],
        ],
        [0.011, 0.003],
        undefined,
        5,
        5,
      );
  }
  for (let i = -1; i <= 1; i++)
    k.blade(
      BONE,
      [
        [i * 0.025, -0.015, 0.2],
        [i * 0.12, -0.03, 0.36],
        [i * 0.14, -0.05, 0.41],
        [i * 0.055, -0.05, 0.21],
      ],
      [0, 1, 0],
      0.009,
    );
  return k.group;
}

function knight(): THREE.Group {
  const k = new SeaSkullKit();
  k.group.name = 'v2-skeletonKnight';
  ribcage(k, [0, 1.72, 0.04], 1.35, 0.38);
  k.limb(
    BONE,
    [
      [0, 2.05, 0.04],
      [0, 2.32, 0.02],
    ],
    [0.07, 0.06],
    undefined,
    8,
    8,
  );
  skullFace(k, [0, 2.48, -0.04], 1.02, 0.95);
  // Helmet embraces the skull, leaving its actual face and jaw visible.
  k.closedLoft(
    DARK,
    [
      [2.38, 0.17, 0.09, 0, 0.11],
      [2.55, 0.235, 0.13, 0, 0.11],
      [2.72, 0.21, 0.12, 0, 0.1],
      [2.84, 0.085, 0.065, 0, 0.08],
      [2.89, 0.008, 0.012, 0, 0.07],
    ],
    18,
    16,
    'metal',
  ).name = 'continuous-curved-helmet-shell';
  k.blade(
    GOLD,
    [
      [-0.06, 2.7, -0.13],
      [0, 3.1, -0.06],
      [0.06, 2.7, -0.13],
      [0, 2.55, -0.16],
    ],
    [0, 0, -1],
    0.025,
    'metal',
  );
  k.limb(
    CLOTH,
    [
      [-0.33, 2.18, 0.04],
      [0, 2.1, -0.28],
      [0.34, 2.19, 0.04],
    ],
    [0.07, 0.09, 0.07],
    undefined,
    16,
    10,
  );
  k.closedLoft(
    DARK,
    [
      [1.25, 0.2, 0.16, 0, 0.015],
      [1.52, 0.3, 0.23, 0, 0.02],
      [1.86, 0.35, 0.245, 0, 0.03],
      [2.06, 0.29, 0.2, 0, 0.035],
      [2.13, 0.14, 0.13, 0, 0.035],
    ],
    22,
    20,
    'metal',
  ).name = 'connected-full-depth-cuirass';
  k.blade(
    DARK,
    [
      [-0.36, 1.84, -0.2],
      [0, 2.05, -0.2],
      [0.36, 1.84, -0.2],
      [0.25, 1.35, -0.19],
      [0, 1.23, -0.25],
      [-0.25, 1.35, -0.19],
    ],
    [0, 0, -1],
    0.09,
    'metal',
  );
  for (const side of [-1, 1]) {
    k.limb(
      GOLD,
      [
        [side * 0.33, 1.84, -0.22],
        [side * 0.25, 1.37, -0.25],
        [0, 1.25, -0.28],
      ],
      [0.015, 0.016, 0.012],
      undefined,
      12,
      6,
      'metal',
    );
    k.blade(
      DARK,
      [
        [side * 0.34, 2.1, 0.02],
        [side * 0.59, 2.22, 0.04],
        [side * 0.8, 1.99, 0.01],
        [side * 0.66, 1.84, -0.08],
        [side * 0.35, 1.89, -0.1],
      ],
      [0, 0, -1],
      0.13,
      'metal',
    );
    k.limb(
      GOLD,
      [
        [side * 0.36, 2.1, -0.07],
        [side * 0.59, 2.2, -0.06],
        [side * 0.78, 1.99, -0.08],
      ],
      [0.014, 0.018, 0.012],
      undefined,
      10,
      6,
      'metal',
    );
    const hand: Vec3 = side < 0 ? [-0.74, 1.49, -0.33] : [0.78, 1.37, -0.4];
    k.limb(
      BONE,
      [[side * 0.55, 1.98, 0.03], [side * 0.69, 1.71, -0.12], hand],
      [0.065, 0.075, 0.055],
      undefined,
      18,
      10,
    );
    if (side > 0) fingerHand(k, hand, 1.05);
    else {
      k.limb(
        BONE,
        [
          [-0.75, 1.43, -0.32],
          [-0.75, 1.57, -0.32],
        ],
        [0.045, 0.045],
        [0.025, 0.025],
        8,
        8,
      );
      k.limb(
        BONE,
        [
          [-0.71, 1.56, -0.31],
          [-0.72, 1.48, -0.4],
          [-0.78, 1.46, -0.38],
        ],
        [0.022, 0.019, 0.009],
        undefined,
        9,
        6,
      );
    }
    if (side < 0)
      for (let f = 0; f < 4; f++)
        k.limb(
          BONE,
          [
            [-0.78, 1.43 + f * 0.035, -0.32],
            [-0.8, 1.43 + f * 0.035, -0.39],
            [-0.73, 1.43 + f * 0.035, -0.41],
            [-0.71, 1.43 + f * 0.035, -0.35],
          ],
          [0.016, 0.019, 0.018, 0.009],
          undefined,
          10,
          6,
        );
    k.limb(DARK, [[side * 0.68, 1.73, -0.13], hand], [0.105, 0.075], undefined, 11, 10, 'metal');
  }
  k.blade(
    BONE,
    [
      [-0.29, 1.19, -0.12],
      [0, 1.0, -0.2],
      [0.29, 1.19, -0.12],
      [0.25, 1.35, -0.11],
      [-0.25, 1.35, -0.11],
    ],
    [0, 0, -1],
    0.07,
  );
  k.limb(
    GOLD,
    [
      [-0.25, 1.28, -0.18],
      [0, 1.25, -0.28],
      [0.25, 1.28, -0.18],
    ],
    [0.024, 0.032, 0.024],
    undefined,
    16,
    8,
    'metal',
  );
  k.closedLoft(
    CLOTH,
    [
      [0.51, 0.02, 0.015, 0, -0.27],
      [0.65, 0.22, 0.035, 0, -0.27],
      [1.08, 0.23, 0.04, 0, -0.25],
      [1.28, 0.16, 0.04, 0, -0.23],
    ],
    16,
    12,
  );
  const legs: Vec3[][] = [
    [
      [-0.2, 1.14, 0.02],
      [-0.47, 0.7, 0.15],
      [-0.66, 0.17, 0.29],
    ],
    [
      [0.2, 1.14, 0.05],
      [0.43, 0.66, -0.32],
      [0.49, 0.18, -0.49],
    ],
  ];
  const lowerStart = k.group.children.length;
  for (const points of legs) {
    const h = points[0],
      a = points[1],
      b = points[2],
      side = h[0] < 0 ? -1 : 1;
    k.limb(
      DARK,
      [h, [(h[0] + a[0]) * 0.5, 0.91, (h[2] + a[2]) * 0.5], a],
      [0.16, 0.19, 0.17],
      [0.13, 0.16, 0.14],
      16,
      12,
      'metal',
    );
    // Overlapping hip lames cover the upper femur without filling the skeletal waist.
    for (let plate = 0; plate < 3; plate++) {
      const y = 1.23 - plate * 0.12,
        x = side * (0.24 + plate * 0.055),
        z = -0.15 - plate * 0.035;
      k.blade(
        DARK,
        [
          [x - 0.17, y + 0.06, z],
          [x + 0.17, y + 0.06, z],
          [x + 0.15, y - 0.13, z - 0.04],
          [x, y - 0.17, z - 0.075],
          [x - 0.15, y - 0.13, z - 0.04],
        ],
        [0, 0, -1],
        0.055,
        'metal',
      );
      k.limb(
        GOLD,
        [
          [x - 0.15, y - 0.11, z - 0.055],
          [x, y - 0.15, z - 0.09],
          [x + 0.15, y - 0.11, z - 0.055],
        ],
        [0.008, 0.01, 0.008],
        undefined,
        8,
        5,
        'metal',
      );
    }
    // A raised poleyn has a real central ridge and a lateral wing, not a sliver tile.
    k.blade(
      DARK,
      [
        [a[0] - 0.2, a[1] + 0.16, a[2] - 0.13],
        [a[0], a[1] + 0.22, a[2] - 0.12],
        [a[0] + 0.2, a[1] + 0.13, a[2] - 0.13],
        [a[0] + 0.17, a[1] - 0.15, a[2] - 0.15],
        [a[0], a[1] - 0.2, a[2] - 0.16],
        [a[0] - 0.17, a[1] - 0.13, a[2] - 0.15],
      ],
      [0, 0, -1],
      0.11,
      'metal',
    );
    k.blade(
      GOLD,
      [
        [a[0] - 0.15, a[1] + 0.13, a[2] - 0.19],
        [a[0], a[1] + 0.17, a[2] - 0.22],
        [a[0] + 0.15, a[1] + 0.11, a[2] - 0.19],
        [a[0], a[1] + 0.1, a[2] - 0.24],
      ],
      [0, 0, -1],
      0.012,
      'metal',
    );
    k.limb(
      DARK,
      [
        [a[0], a[1] - 0.06, a[2]],
        [b[0], 0.36, b[2]],
        [b[0], b[1], b[2]],
      ],
      [0.18, 0.145, 0.115],
      [0.15, 0.14, 0.11],
      16,
      12,
      'metal',
    );
    k.blade(
      DARK,
      [
        [a[0] - 0.13, a[1] - 0.11, a[2] - 0.15],
        [a[0] + 0.13, a[1] - 0.11, a[2] - 0.15],
        [b[0] + 0.1, 0.22, b[2] - 0.11],
        [b[0], 0.16, b[2] - 0.16],
        [b[0] - 0.1, 0.22, b[2] - 0.11],
      ],
      [0, 0, -1],
      0.055,
      'metal',
    );
    k.closedLoft(
      DARK,
      [
        [0.008, 0.13, 0.28, b[0], b[2] - 0.14],
        [0.055, 0.19, 0.31, b[0], b[2] - 0.14],
        [0.13, 0.18, 0.29, b[0], b[2] - 0.11],
        [0.22, 0.13, 0.18, b[0], b[2] - 0.04],
        [0.29, 0.1, 0.1, b[0], b[2]],
      ],
      12,
      12,
      'metal',
    );
    for (let plate = 0; plate < 3; plate++) {
      const z = b[2] - 0.12 - plate * 0.085,
        y = 0.245 - plate * 0.04;
      k.blade(
        DARK,
        [
          [b[0] - 0.17, y - 0.035, z],
          [b[0], y + 0.025, z - 0.025],
          [b[0] + 0.17, y - 0.035, z],
          [b[0] + 0.15, y - 0.055, z - 0.09],
          [b[0] - 0.15, y - 0.055, z - 0.09],
        ],
        [0, 1, 0],
        0.025,
        'metal',
      );
      k.limb(
        GOLD,
        [
          [b[0] - 0.15, y - 0.04, z - 0.085],
          [b[0], y - 0.012, z - 0.1],
          [b[0] + 0.15, y - 0.04, z - 0.085],
        ],
        [0.006, 0.008, 0.006],
        undefined,
        8,
        5,
        'metal',
      );
    }
  }
  for (const child of k.group.children.slice(lowerStart)) child.name = 'knight-lower-articulated-armor';
  const shield = k.blade(
    DARK,
    [
      [0.52, 2.04, -0.54],
      [0.85, 2.22, -0.55],
      [1.24, 2.0, -0.52],
      [1.19, 1.12, -0.57],
      [0.91, 0.55, -0.62],
      [0.51, 1.13, -0.59],
    ],
    [0, 0, -1],
    0.11,
    'metal',
  );
  shield.name = 'kite-shield-with-real-rear-grip';
  k.limb(
    GOLD,
    [
      [0.52, 2.04, -0.57],
      [0.85, 2.22, -0.58],
      [1.24, 2.0, -0.55],
      [1.19, 1.12, -0.6],
      [0.91, 0.55, -0.65],
      [0.51, 1.13, -0.62],
      [0.52, 2.04, -0.57],
    ],
    [0.018, 0.02, 0.018, 0.019, 0.016, 0.018, 0.018],
    undefined,
    30,
    7,
    'metal',
  );
  k.limb(
    BONE,
    [
      [0.86, 0.87, -0.7],
      [0.86, 1.93, -0.7],
    ],
    [0.035, 0.05],
    undefined,
    12,
    8,
  );
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++)
      k.limb(
        BONE,
        [
          [0.86, 1.84 - i * 0.23, -0.7],
          [0.86 + side * 0.22, 1.76 - i * 0.23, -0.68],
          [0.86 + side * 0.27, 1.6 - i * 0.23, -0.64],
        ],
        [0.027, 0.035, 0.018],
        undefined,
        10,
        7,
      );
  k.limb(
    0x69594b,
    [
      [-0.56, 0.96, -0.35],
      [-0.75, 1.51, -0.35],
      [-1.13, 2.72, -0.32],
    ],
    [0.037, 0.037, 0.032],
    undefined,
    18,
    10,
    'leather',
  );
  k.blade(
    BONE,
    [
      [-1.03, 2.63, -0.32],
      [-1.35, 3.35, -0.31],
      [-1.25, 2.62, -0.32],
      [-1.13, 2.48, -0.32],
    ],
    [0, 0, -1],
    0.035,
  ).name = 'long-bone-lance-not-sword';
  k.closedLoft(
    BONE,
    [
      [1.33, 0.025, 0.02, 0.86, -0.735],
      [1.48, 0.065, 0.035, 0.86, -0.74],
      [1.72, 0.085, 0.045, 0.86, -0.74],
      [1.88, 0.035, 0.025, 0.86, -0.735],
    ],
    10,
    10,
  ).name = 'shield-sculpted-sternum';
  for (const side of [-1, 1]) {
    for (let row = 0; row < 3; row++) {
      const y = 1.85 - row * 0.15;
      k.limb(
        BONE,
        [
          [side * 0.035, y, -0.34],
          [side * 0.16, y - 0.015, -0.355],
          [side * 0.27, y - 0.085, -0.29],
        ],
        [0.018, 0.029, 0.012],
        undefined,
        10,
        7,
      ).name = 'cuirass-raised-bone-rib';
    }
    for (let layer = 0; layer < 2; layer++) {
      const x = side * (0.59 + layer * 0.035),
        y = 2.04 - layer * 0.12;
      k.blade(
        DARK,
        [
          [x - side * 0.17, y + 0.06, -0.07],
          [x + side * 0.2, y - 0.03, -0.015],
          [x + side * 0.19, y - 0.15, -0.055],
          [x, y - 0.19, -0.17],
          [x - side * 0.16, y - 0.1, -0.14],
        ],
        [0, 0, -1],
        0.045,
        'metal',
      ).name = 'overlapping-pauldron-lame';
    }
  }
  k.blade(
    BONE,
    [
      [-1.04, 2.68, -0.34],
      [-1.18, 2.81, -0.35],
      [-1.28, 2.68, -0.34],
      [-1.16, 2.58, -0.35],
    ],
    [0, 0, -1],
    0.055,
  ).name = 'carved-lance-root-collar';
  k.limb(
    GOLD,
    [
      [-1.03, 2.64, -0.35],
      [-1.15, 2.7, -0.4],
      [-1.28, 2.64, -0.35],
    ],
    [0.012, 0.019, 0.012],
    undefined,
    10,
    6,
    'metal',
  ).name = 'lance-bone-ferrule';
  // Lean the coherent upper assembly into the shield-leading knee; hands stay on weapons.
  const pose = new THREE.Matrix4()
    .makeTranslation(0, 1.2, 0)
    .multiply(new THREE.Matrix4().makeRotationY(-0.09))
    .multiply(new THREE.Matrix4().makeRotationX(-0.1))
    .multiply(new THREE.Matrix4().makeTranslation(0, -1.2, 0));
  for (const child of k.group.children) if (!child.name.startsWith('knight-lower-')) child.applyMatrix4(pose);
  return k.group;
}
/** A genuinely curved, closed cloth layer fitted to the weighted robe, with a shared
 * analytic boundary for its gold piping. No detached flat banner or z-offset patch. */
function fittedRoyalPanel(k: SeaSkullKit, robe: THREE.Mesh, side: number): void {
  robe.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(),
    rows = 22,
    columns = 8;
  const point = (t: number, u: number): THREE.Vector3 => {
    const y = 2.075 - 1.86 * t + 0.055 * Math.pow(t, 8) * (1 - u * u);
    const center = side * (0.065 + 0.28 * Math.pow(t, 1.2));
    const width = (0.026 + 0.09 * Math.sin(Math.PI * t * 0.72)) * (1 - 0.35 * Math.pow(t, 12));
    const x = center + u * width;
    ray.set(new THREE.Vector3(x, y, -4), new THREE.Vector3(0, 0, 1));
    const hit = ray.intersectObject(robe, false)[0];
    if (!hit) throw new Error('Royal cloth point lies outside fitted robe: ' + [t, u, x, y]);
    const fold = 0.012 * Math.sin(Math.PI * t) * (0.5 + 0.5 * Math.cos(u * Math.PI * 2 + t * 1.7));
    return new THREE.Vector3(x, y, hit.point.z - 0.028 - fold - (side === 0 ? 0.014 : 0));
  };
  const positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  const count = (rows + 1) * (columns + 1);
  for (let layer = 0; layer < 2; layer++)
    for (let row = 0; row <= rows; row++)
      for (let col = 0; col <= columns; col++) {
        const p = point(row / rows, (col / columns) * 2 - 1);
        p.z += layer * 0.007;
        positions.push(...p.toArray());
        uv.push(col / columns, 1 - row / rows);
      }
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < columns; col++) {
      const a = row * (columns + 1) + col,
        b = a + columns + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
      indices.push(a + count, b + count, a + 1 + count, a + 1 + count, b + count, b + 1 + count);
    }
  const rim = [
    ...Array.from({ length: columns + 1 }, (_, i) => i),
    ...Array.from({ length: rows }, (_, i) => (i + 1) * (columns + 1) + columns),
    ...Array.from({ length: columns }, (_, i) => rows * (columns + 1) + columns - 1 - i),
    ...Array.from({ length: rows - 1 }, (_, i) => (rows - 1 - i) * (columns + 1)),
  ];
  for (let i = 0; i < rim.length; i++) {
    const a = rim[i],
      b = rim[(i + 1) % rim.length];
    indices.push(a, b + count, b, a, a + count, b + count);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  k.mesh(g, CLOTH).name = 'surface-fitted-folded-royal-front-layer';
  if (side !== 0) {
    const edge = Array.from(
      { length: 11 },
      (_, i) =>
        point(i / 10, side)
          .add(new THREE.Vector3(0, 0, -0.004))
          .toArray() as Vec3,
    );
    k.limb(
      GOLD,
      edge,
      edge.map((_, i) => (i === 0 || i === 10 ? 0.004 : 0.009)),
      undefined,
      22,
      6,
      'metal',
    ).name = 'robe-edge-piping-shared-surface-boundary';
  }
}

function king(): THREE.Group {
  const k = new SeaSkullKit();
  k.group.name = 'v2-skullKing';
  const royalRobe = k.closedLoft(
    CLOTH,
    [
      [0.12, 0.43, 0.25, 0, 0.11],
      [0.32, 0.62, 0.28, 0, 0.08],
      [0.65, 0.56, 0.28, 0, 0.07],
      [1.15, 0.4, 0.23, 0, 0.04],
      [1.75, 0.24, 0.17, 0, 0.02],
      [2.12, 0.3, 0.18],
      [2.3, 0.13, 0.11],
    ],
    30,
    24,
  );
  royalRobe.name = 'continuous-weighted-royal-robe';
  const rp = royalRobe.geometry.getAttribute('position');
  for (let i = 0; i < rp.count; i++) {
    const x = rp.getX(i),
      y = rp.getY(i),
      z = rp.getZ(i),
      angle = Math.atan2(x, z - 0.05),
      fold = 0.045 * Math.max(0, 1 - y / 1.8) * Math.cos(angle * 9 + y * 0.7);
    rp.setXYZ(i, x + Math.sin(angle) * fold, y, z + Math.cos(angle) * fold);
  }
  royalRobe.geometry.computeVertexNormals();
  k.limb(
    DARK,
    [
      [0, 2.22, 0.04],
      [0, 2.49, 0.015],
    ],
    [0.027, 0.025],
    undefined,
    8,
    8,
  ).name = 'recessed-cervical-spine-core';
  for (let v = 0; v < 3; v++) {
    const y = 2.3 + v * 0.055;
    k.closedLoft(
      BONE,
      [
        [y - 0.024, 0.04, 0.035, 0, 0.02],
        [y, 0.075, 0.055, 0, 0.02],
        [y + 0.022, 0.045, 0.035, 0, 0.02],
      ],
      4,
      10,
    ).name = 'sculpted-cervical-vertebra';
  }
  k.limb(
    CLOTH,
    [
      [-0.23, 2.24, -0.04],
      [-0.25, 2.44, 0.07],
      [0, 2.51, 0.18],
      [0.25, 2.44, 0.07],
      [0.23, 2.24, -0.04],
    ],
    [0.045, 0.065, 0.075, 0.065, 0.045],
    [0.03, 0.04, 0.045, 0.04, 0.03],
    22,
    8,
  ).name = 'raised-royal-regalia-collar';
  skullFace(k, [0, 2.69, -0.015], 0.98, 0.87);
  for (const side of [-1, 1]) {
    k.closedLoft(
      CLOTH,
      [
        [0.18, 0.025, 0.025, side * (side < 0 ? 0.9 : 0.6), side < 0 ? 0.64 : 0.4],
        [0.47, 0.27, 0.115, side * (side < 0 ? 0.78 : 0.6), side < 0 ? 0.56 : 0.36],
        [0.95, 0.24, 0.12, side * 0.62, side < 0 ? 0.44 : 0.3],
        [1.45, 0.18, 0.1, side * 0.48, 0.26],
        [2, 0.14, 0.07, side * 0.4, 0.18],
        [2.35, 0.04, 0.04, side * 0.27, 0.14],
      ],
      26,
      14,
    ).name = 'flowing-royal-mantle-panel';
    k.limb(
      BONE,
      [
        [side * 0.22, 2.24, 0.06],
        [side * 0.48, 2.36, 0.04],
        [side * 0.66, 2.57, 0.09],
        [side * 0.59, 2.78, 0.13],
      ],
      [0.065, 0.09, 0.065, 0.003],
      undefined,
      24,
      12,
    ).name = 'royal-scapular-horn';
    k.blade(
      DARK,
      [
        [side * 0.12, 2.28, -0.17],
        [side * 0.34, 2.31, -0.1],
        [side * 0.29, 2.12, -0.2],
        [side * 0.15, 2.04, -0.22],
      ],
      [0, 0, -1],
      0.025,
      'metal',
    );
  }
  for (const side of [-1, 1]) {
    k.blade(
      DARK,
      [
        [side * 0.28, 2.29, -0.09],
        [side * 0.57, 2.34, -0.02],
        [side * 0.65, 2.17, -0.02],
        [side * 0.47, 2.05, -0.13],
        [side * 0.28, 2.12, -0.16],
      ],
      [0, 0, -1],
      0.055,
      'metal',
    ).name = 'layered-royal-shoulder-armor';
    k.limb(
      GOLD,
      [
        [side * 0.28, 2.29, -0.15],
        [side * 0.48, 2.3, -0.14],
        [side * 0.61, 2.19, -0.08],
      ],
      [0.009, 0.013, 0.008],
      undefined,
      10,
      6,
      'metal',
    ).name = 'royal-shoulder-edge';
  }
  // Three large crown prongs, rather than numerous unreadable ornaments.
  k.closedLoft(
    GOLD,
    [
      [2.86, 0.16, 0.135],
      [2.96, 0.175, 0.14],
    ],
    6,
    16,
    'metal',
  );
  for (const [x, height] of [
    [-0.15, 3.23],
    [0, 3.38],
    [0.15, 3.23],
  ])
    k.limb(
      GOLD,
      [
        [x, 2.92, -0.04],
        [x * 1.16, 3.09, -0.04],
        [x * 0.96, height, -0.035],
      ],
      [0.028, 0.025, 0.001],
      undefined,
      12,
      7,
      'metal',
    );
  k.patch(
    k.group.getObjectByName('sculpted-skull-with-recessed-orbits') as THREE.Mesh,
    0x8b54be,
    [
      [-0.028, 2.83],
      [0.028, 2.83],
      [0.022, 2.77],
      [-0.022, 2.77],
    ],
    'z',
    -1,
    0.01,
    'glow',
  );
  const left: Vec3 = [-0.76, 1.73, -0.33],
    right: Vec3 = [0.87, 1.79, -0.13];
  for (const [side, hand] of [
    [-1, left],
    [1, right],
  ] as const) {
    k.limb(
      BONE,
      [[side * 0.37, 2.15, 0.01], [side * 0.57, 1.85, -0.04], hand],
      [0.045, 0.045, 0.034],
      undefined,
      20,
      9,
    );
    const handStart = k.group.children.length;
    if (side < 0) {
      fingerHand(k, hand, 1.0, false);
      const m = new THREE.Matrix4()
        .makeTranslation(...hand)
        .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
        .multiply(new THREE.Matrix4().makeTranslation(-hand[0], -hand[1], -hand[2]));
      for (const child of k.group.children.slice(handStart))
        if (child instanceof THREE.Mesh) child.geometry.applyMatrix4(m);
    } else {
      k.limb(
        BONE,
        [
          [0.86, 1.72, -0.12],
          [0.86, 1.88, -0.12],
        ],
        [0.045, 0.045],
        [0.024, 0.024],
        8,
        8,
      );
      k.limb(
        BONE,
        [
          [0.84, 1.87, -0.12],
          [0.89, 1.78, -0.2],
          [0.94, 1.77, -0.17],
        ],
        [0.023, 0.018, 0.009],
        undefined,
        9,
        6,
      );
    }
    k.closedLoft(
      CLOTH,
      [
        [1.88, 0.08, 0.08, side * 0.55, -0.025],
        [2.08, 0.16, 0.14, side * 0.39, 0.025],
        [2.24, 0.07, 0.08, side * 0.31, 0.03],
      ],
      15,
      12,
    );
  }
  k.limb(
    0x84745f,
    [
      [0.91, 0.15, -0.14],
      [0.9, 1.79, -0.14],
      [0.94, 2.95, -0.13],
    ],
    [0.04, 0.04, 0.037],
    undefined,
    24,
    10,
    'leather',
  );
  k.limb(
    DARK,
    [
      [0.94, 2.92, -0.13],
      [1.14, 3.28, -0.13],
      [1.06, 3.44, -0.13],
      [0.8, 3.45, -0.13],
      [0.5, 3.32, -0.13],
      [0.33, 3.19, -0.13],
    ],
    [0.035, 0.09, 0.14, 0.13, 0.07, 0.001],
    [0.022, 0.035, 0.04, 0.035, 0.022, 0.001],
    32,
    10,
  ).name = 'royal-scythe-curved-blade';
  k.limb(
    0x9564ba,
    [
      [0.34, 3.2, -0.17],
      [0.56, 3.35, -0.18],
      [0.89, 3.42, -0.18],
      [1.05, 3.34, -0.17],
      [0.91, 2.93, -0.16],
    ],
    [0.002, 0.012, 0.015, 0.012, 0.002],
    undefined,
    24,
    7,
    'glow',
  );
  for (let f = 0; f < 4; f++)
    k.limb(
      BONE,
      [
        [0.87, 1.74 + f * 0.034, -0.1],
        [0.94, 1.74 + f * 0.034, -0.09],
        [0.96, 1.74 + f * 0.034, -0.18],
        [0.9, 1.74 + f * 0.034, -0.2],
      ],
      [0.018, 0.02, 0.017, 0.009],
      undefined,
      10,
      6,
    ).name = 'wrapped-scythe-grip';
  for (const side of [-1, 0, 1]) fittedRoyalPanel(k, royalRobe, side);
  for (const side of [-1, 1])
    k.closedLoft(
      CLOTH,
      [
        [side < 0 ? 0.3 : 0.48, 0.01, 0.01, side * (side < 0 ? 1.08 : 0.83), side < 0 ? 0.7 : 0.43],
        [0.62, 0.15, 0.055, side * (side < 0 ? 0.94 : 0.75), 0.53],
        [1.0, 0.17, 0.065, side * 0.73, 0.39],
        [1.3, 0.12, 0.04, side * 0.46, 0.16],
        [1.85, 0.025, 0.02, side * 0.35, 0.12],
      ],
      24,
      12,
    ).name = 'swept-royal-side-tail';
  fittedArmor(
    k,
    royalRobe,
    DARK,
    [
      [-0.2, 2.08],
      [0, 2.2],
      [0.2, 2.08],
      [0.145, 1.72],
      [0.055, 1.6],
      [0, 1.5],
      [-0.055, 1.6],
      [-0.145, 1.72],
    ],
    0.024,
    4,
  ).name = 'fitted-regal-breastplate';
  fittedArmor(
    k,
    royalRobe,
    BONE,
    [
      [0, 2.155],
      [0.075, 2.13],
      [0.082, 2.075],
      [0.046, 2.02],
      [0.059, 1.965],
      [0.041, 1.91],
      [0.05, 1.85],
      [0.028, 1.76],
      [0, 1.64],
      [-0.028, 1.76],
      [-0.05, 1.85],
      [-0.041, 1.91],
      [-0.059, 1.965],
      [-0.046, 2.02],
      [-0.082, 2.075],
      [-0.075, 2.13],
    ],
    0.051,
    4,
    0.038,
  ).name = 'raised-funerary-sternum-crest';
  for (const side of [-1, 1])
    fittedArmor(
      k,
      royalRobe,
      GOLD,
      [
        [side * 0.18, 2.08],
        [side * 0.2, 2.075],
        [side * 0.145, 1.72],
        [side * 0.055, 1.6],
        [side * 0.13, 1.74],
      ],
      0.043,
      3,
    ).name = 'seated-breastplate-gilt-seam';

  k.limb(
    BONE,
    [
      [0.94, 2.94, -0.15],
      [1.14, 3.28, -0.15],
      [1.06, 3.44, -0.15],
      [0.8, 3.45, -0.15],
      [0.51, 3.33, -0.15],
    ],
    [0.035, 0.045, 0.042, 0.035, 0.005],
    [0.025, 0.027, 0.025, 0.022, 0.003],
    22,
    8,
  ).name = 'carved-ivory-scythe-spine';
  for (let band = 0; band < 3; band++) {
    const y = 2.12 + band * 0.26;
    k.closedLoft(
      GOLD,
      [
        [y - 0.035, 0.053, 0.05, 0.915, -0.14],
        [y + 0.035, 0.053, 0.05, 0.915, -0.14],
      ],
      3,
      10,
      'metal',
    ).name = 'scythe-staff-ferrule';
  }
  for (let i = 0; i < 3; i++) {
    const y = 1.96 + i * 0.19,
      x = -0.8 + Math.sin(i * 1.8) * 0.12;
    k.limb(
      BONE,
      [
        [x - 0.13, y - 0.02, -0.3],
        [x - 0.14, y + 0.07, -0.33],
        [x, y + 0.14, -0.35],
        [x + 0.16, y + 0.08, -0.34],
        [x + 0.18, y + 0.015, -0.33],
      ],
      [0.008, 0.032, 0.045, 0.029, 0.001],
      [0.006, 0.017, 0.023, 0.018, 0.001],
      13,
      7,
    ).name = 'levitating-sculpted-bone-talon';
    k.limb(
      0x9564ba,
      [
        [x - 0.2, y - 0.02, -0.28],
        [x - 0.17, y + 0.12, -0.3],
        [x, y + 0.18, -0.32],
        [x + 0.2, y + 0.09, -0.31],
      ],
      [0.001, 0.006, 0.007, 0.001],
      undefined,
      12,
      5,
      'glow',
    ).name = 'violet-talon-orbit';
  }
  return k.group;
}

export function buildSkullMonster(id: string, _color: number): THREE.Group | undefined {
  if (id === 'boneGolem') return dressSkullBody(boneGolem());
  if (id === 'skeletonSoldier') return dressSkullBody(soldier());
  if (id === 'skullBird') return dressSkullBody(skullBird());
  return undefined;
}
export function buildSkullBoss(id: string): THREE.Group | undefined {
  if (id === 'skeletonKnight') return dressSkullBody(knight());
  if (id === 'skullKing') return dressSkullBody(king());
  return undefined;
}
