import { dressCastleBeast, dressGhoulCloth } from './castleBeastMaterials';
import * as THREE from 'three';
import { loftGeometry } from '../../SculptKit';
import type { Vec3 } from '../../ModelKit';
import { CastleKit, leaf, patch, embeddedPredatorEye } from './castleForms';
const fur = 0x49464b,
  dark = 0x292630,
  bone = 0xd8ccad,
  crimson = 0x6a2635,
  leather = 0x514038;

function wing(k: CastleKit, side: number): void {
  const anchor = new THREE.Vector3(side * 0.27, 0.27, 0.015);
  const points = [
    [0.09, -0.25, 0.03],
    [0.26, -0.08, 0.04],
    [0.4, -0.18, 0.03],
    [0.45, 0.07, 0.04],
    [0.64, -0.02, 0.025],
    [0.64, 0.2, 0.02],
    [0.94, 0.5, 0.01],
    [0.67, 0.54, 0.02],
    [0.27, 0.27, 0.01],
  ].map((p) => new THREE.Vector3(side * p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(points);
  const p: number[] = [],
    uv: number[] = [],
    ix: number[] = [],
    n = 30,
    m = 9;
  for (let j = 0; j <= m; j++)
    for (let i = 0; i <= n; i++) {
      const t = i / n,
        r = j / m,
        v = anchor.clone().lerp(curve.getPoint(t), r);
      v.z += 0.04 * Math.sin(t * Math.PI * 5) * Math.sin(r * Math.PI);
      p.push(...v.toArray());
      uv.push(t, r);
    }
  for (let j = 0; j < m; j++)
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i,
        b = a + n + 1;
      ix.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(ix);
  g.computeVertexNormals();
  const mesh = k.mesh(g, 0x713346);
  (mesh.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  mesh.name = 'finger-supported-scalloped-membrane';
  const fingers = [points[0], points[2], points[4], points[6]];
  for (let i = 0; i < fingers.length; i++) {
    const end = fingers[i];
    k.path(
      dark,
      [
        anchor.toArray() as [number, number, number],
        [(side * (0.27 + Math.abs(end.x) * 0.5)) / 1.5, (0.27 + end.y) * 0.5, -0.015],
        end.toArray() as [number, number, number],
      ],
      [0.018, 0.023, 0.008],
      [0.016, 0.02, 0.006],
      'bat-wing-finger',
      12,
      6,
    );
  }
  const leading: Vec3[] = [
    [side * 0.09, 0.1, 0.015],
    ...Array.from({ length: 21 }, (_, i) => curve.getPoint(1 - (i / 20) * 0.25).toArray() as [number, number, number]),
  ];
  k.path(dark, leading, [0.035, 0.025, 0.005], undefined, 'bat-leading-arm', 32, 6);
}
export function bat(): THREE.Group {
  const k = new CastleKit();
  k.group.name = 'bat';
  const body = k.form(
    dark,
    [
      [-0.32, 0, 0],
      [-0.24, 0.055, 0.065],
      [-0.14, 0.06, 0.07],
      [-0.04, 0.09, 0.075],
      [0.055, 0.105, 0.09],
      [0.1, 0.075, 0.07],
      [0.19, 0.13, 0.11],
      [0.29, 0.09, 0.09],
      [0.32, 0, 0],
    ],
    'continuous-bat-head-body',
    14,
    18,
  );
  // Small lateral bat orbits are shaped in the continuous skull, not human white lid rings.
  const bp = body.geometry.getAttribute('position');
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i),
      y = bp.getY(i),
      z = bp.getZ(i);
    if (z >= 0) continue;
    const roof = Math.exp(-(((Math.abs(x) - 0.063) / 0.048) ** 2) - ((y - 0.223) / 0.024) ** 2);
    bp.setZ(i, z - 0.013 * roof);
  }
  body.geometry.computeVertexNormals();
  wing(k, -1);
  wing(k, 1);
  for (const side of [-1, 1]) {
    leaf(
      k,
      dark,
      [side * 0.045, 0.21, -0.02],
      [side * 0.15, 0.19, 0.025],
      [side * 0.2, 0.51, 0.025],
      0.018,
      'long-bat-ear',
    );
    leaf(
      k,
      0x8a4b59,
      [side * 0.064, 0.24, -0.043],
      [side * 0.125, 0.23, -0.018],
      [side * 0.18, 0.46, 0.005],
      0.004,
      'bat-ear-interior',
    );
    embeddedPredatorEye(k, body, side, 0.063, 0.2, 1.05, 'bat');
    k.path(
      dark,
      [
        [side * 0.06, -0.22, 0],
        [side * 0.09, -0.34, 0.02],
        [side * 0.13, -0.36, -0.04],
      ],
      [0.025, 0.018, 0.007],
      undefined,
      'bat-hind-foot',
      8,
      6,
    );
    for (let i = 0; i < 2; i++)
      k.path(
        bone,
        [
          [side * 0.12 + i * 0.015, -0.35, -0.035],
          [side * 0.13 + i * 0.015, -0.36, -0.07],
        ],
        [0.006, 0],
        undefined,
        'bat-toe-claw',
        4,
        5,
      );
    k.path(
      bone,
      [
        [side * 0.03, 0.105, -0.165],
        [side * 0.029, 0.079, -0.171],
      ],
      [0.012, 0],
      undefined,
      'bat-fang',
      4,
      5,
    );
  }
  k.form(
    dark,
    [
      [0.08, 0.035, 0.035, 0, -0.11],
      [0.125, 0.055, 0.05, 0, -0.12],
      [0.18, 0.025, 0.025, 0, -0.1],
    ],
    'modeled-bat-muzzle',
    8,
    6,
  );
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++)
      k.path(
        i === 0 ? 0x93837d : fur,
        [
          [side * 0.06, 0.105 - i * 0.022, -0.015],
          [side * (0.085 + i * 0.012), 0.09 - i * 0.025, -0.035],
          [side * (0.13 + i * 0.008), 0.045 - i * 0.035, 0.07],
        ],
        [0.022, 0.027, 0],
        [0.018, 0.022, 0],
        'bat-neck-ruff',
        6,
        5,
      );
  const nose = k.sphere(0x201b21, [0, 0.135, -0.171], [0.023, 0.013, 0.008], k.group, 8);
  nose.name = 'bat-nose-leather';
  k.group.traverse((ob) => {
    if (!(ob instanceof THREE.Mesh)) return;
    ob.updateMatrix();
    ob.geometry.applyMatrix4(ob.matrix);
    ob.position.set(0, 0, 0);
    ob.rotation.set(0, 0, 0);
    ob.scale.set(1, 1, 1);
    ob.updateMatrix();
    const p = ob.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (y < 0.07) p.setY(i, 0.07 + (y - 0.07) * 0.8);
      if (ob.name === 'bat-neck-ruff') p.setY(i, p.getY(i) - 0.045);
    }
    ob.geometry.computeVertexNormals();
  });
  dressCastleBeast(k.group);
  return k.group;
}
export function ghoul(): THREE.Group {
  const k = new CastleKit();
  k.group.name = 'ghoul';
  const shroud = k.form(
    0x615c5c,
    [
      [-0.57, 0, 0, 0, 0.1],
      [-0.49, 0.15, 0.14, 0, 0.06],
      [-0.34, 0.27, 0.21],
      [-0.1, 0.35, 0.26],
      [0.14, 0.36, 0.24],
      [0.29, 0.24, 0.17],
      [0.35, 0, 0],
    ],
    'hunched-heavy-shroud',
    16,
    20,
  );
  const hood = k.mesh(
    loftGeometry(
      [
        [-0.24, 0.235, 0.25, 0, -0.3],
        [-0.21, 0.29, 0.3, 0, -0.3],
        [-0.15, 0.38, 0.36, 0, -0.29],
        [0.04, 0.36, 0.34, 0, -0.28],
        [0.22, 0.27, 0.28, 0, -0.27],
        [0.33, 0, 0, 0, -0.24],
      ],
      18,
      28,
    ).rotateX(Math.PI / 2),
    0x777071,
  );
  hood.name = 'open-faced-layered-cowl';
  for (const o of [shroud, hood]) {
    const p = o.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      if (o === hood)
        p.setXYZ(
          i,
          x * 0.88,
          y + 0.095 * Math.exp(-((x / 0.12) ** 2)) * THREE.MathUtils.smoothstep(y, 0.3, 0.6),
          z - 0.085,
        );
      else
        p.setXYZ(
          i,
          x * (1 + 0.18 * THREE.MathUtils.smoothstep(y, -0.1, 0.2)),
          y,
          z + 0.025 * Math.sin(x * 44 + y * 8) * Math.sin((y + 0.57) * 3),
        );
    }
    const colors: number[] = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i),
        ang = Math.atan2(y - 0.3, x);
      const phase = o === hood ? ang * 9 + z * 12 : x * 35 + y * 5;
      const fold = Math.sin(phase);
      if (o === hood) {
        const v = new THREE.Vector2(x, y - 0.3).normalize();
        p.setX(i, x + v.x * 0.01 * fold);
        p.setY(i, y + v.y * 0.01 * fold);
      } else p.setZ(i, z - 0.015 * fold);
      const c = new THREE.Color(o === hood ? 0x777071 : 0x615c5c);
      c.multiplyScalar(0.9 + 0.1 * fold);
      colors.push(c.r, c.g, c.b);
    }
    o.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mat = (o.material as THREE.MeshStandardMaterial).clone();
    mat.color.set(0xffffff);
    mat.vertexColors = true;
    mat.roughness = 0.93;
    o.material = mat;
    o.geometry.computeVertexNormals();
  }
  // The first ring is intentionally the cloth opening, with a recessed separate face.
  const face = k.form(
    0x25242a,
    [
      [0.05, 0, 0, 0, -0.13],
      [0.12, 0.12, 0.075, 0, -0.13],
      [0.28, 0.18, 0.09, 0, -0.13],
      [0.43, 0.13, 0.07, 0, -0.12],
      [0.5, 0, 0, 0, -0.1],
    ],
    'recessed-ghoul-face',
    12,
    16,
  );
  face.geometry.translate(0, 0, -0.105);
  patch(
    k,
    face,
    0x100f12,
    [
      [-0.1, 0.245],
      [0.1, 0.245],
      [0.105, 0.145],
      [-0.105, 0.145],
    ],
    0.008,
    'shadowed-ghoul-mouth',
  );
  k.form(
    0x302b30,
    [
      [0.105, 0.04, 0.015, 0, -0.31],
      [0.135, 0.105, 0.025, 0, -0.32],
      [0.16, 0.11, 0.025, 0, -0.32],
      [0.18, 0.095, 0.015, 0, -0.31],
    ],
    'ghoul-face-lower-jaw',
    10,
    5,
  );
  for (const side of [-1, 1])
    k.path(
      bone,
      [
        [side * 0.06, 0.14, -0.35],
        [side * 0.054, 0.167, -0.355],
      ],
      [0.011, 0],
      undefined,
      'ghoul-lower-fang',
      3,
      5,
    );
  for (const side of [-1, 1]) {
    patch(
      k,
      face,
      0xf3af3b,
      [
        [side * 0.035, 0.335],
        [side * 0.12, 0.36],
        [side * 0.105, 0.335],
        [side * 0.045, 0.325],
      ],
      0.007,
      'ghoul-ember-eye',
      'glow',
    );
    // One continuous forearm/wrist/palm surface: no overlapping closed root cap.
    k.path(
      0x48464b,
      [
        [side * 0.29, 0.09, 0.03],
        [side * 0.43, -0.07, -0.02],
        [side * 0.51, -0.3, -0.14],
        [side * 0.53, -0.38, -0.18],
        [side * 0.52, -0.45, -0.2],
      ],
      [0.14, 0.12, 0.078, 0.1, 0.065],
      [0.14, 0.12, 0.067, 0.08, 0.045],
      'continuous-ghoul-arm-wrist-palm',
      22,
      10,
    );
    for (let i = 0; i < 4; i++)
      k.path(
        0x48464b,
        [
          [side * 0.53 + (i - 1.5) * 0.037, -0.4, -0.2],
          [side * 0.57 + (i - 1.5) * 0.04, -0.5, -0.23],
          [side * 0.56 + (i - 1.5) * 0.035, -0.55, -0.18],
        ],
        [0.022, 0.018, 0],
        undefined,
        'curled-ghoul-finger',
        8,
        6,
      );
    k.path(
      bone,
      [
        [side * 0.062, 0.235, -0.365],
        [side * 0.052, 0.175, -0.37],
      ],
      [0.013, 0],
      undefined,
      'small-ghoul-fang',
      4,
      6,
    );
    leaf(
      k,
      0x615c5c,
      [side * 0.24, 0.17, -0.08],
      [side * 0.38, 0.1, 0.06],
      [side * 0.54, -0.18, -0.05],
      0.035,
      'hunched-shoulder-drape',
    );
  }
  k.path(
    0x777071,
    [
      [0, -0.39, 0.0],
      [0.1, -0.48, 0.0],
      [0.16, -0.54, -0.07],
      [0.08, -0.58, -0.17],
    ],
    [0.15, 0.11, 0.06, 0],
    [0.11, 0.1, 0.05, 0],
    'curling-spectral-hem',
    14,
    10,
  );
  for (const side of [-1, 1])
    k.path(
      0x48464b,
      [
        [side * 0.46, -0.35, -0.18],
        [side * 0.41, -0.4, -0.24],
        [side * 0.43, -0.47, -0.24],
      ],
      [0.036, 0.03, 0],
      [0.03, 0.025, 0],
      'opposed-ghoul-thumb',
      7,
      6,
    );
  k.group.traverse((ob) => {
    if (!(ob instanceof THREE.Mesh)) return;
    const p = ob.geometry.getAttribute('position');
    const head = /cowl|face|mouth|eye|fang/.test(ob.name);
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      if (head) {
        x *= 0.78;
        y = 0.3 + (y - 0.3) * 0.78;
        z = -0.2 + (z + 0.2) * 0.85;
      } else if (/shroud|shoulder-drape/.test(ob.name)) {
        x *= 1 + 0.18 * THREE.MathUtils.smoothstep(y, -0.3, 0.2);
        z -= 0.012 * Math.sin(x * 25 + y * 8) * Math.sin((y + 0.58) * 3);
      }
      p.setXYZ(i, x, y, z);
    }
    ob.geometry.computeVertexNormals();
  });
  shroud.updateMatrixWorld(true);
  const clothRay = new THREE.Raycaster();
  for (const ob of k.group.children) {
    if (!(ob instanceof THREE.Mesh) || !/layered-ragged-shroud|hunched-shoulder-drape/.test(ob.name)) continue;
    const p = ob.geometry.getAttribute('position');
    const layer = 30;
    for (let i = 0; i < p.count; i++) {
      clothRay.set(new THREE.Vector3(p.getX(i), p.getY(i), -5), new THREE.Vector3(0, 0, 1));
      const hit = clothRay.intersectObject(shroud)[0];
      if (!hit) continue;
      const front = i < layer || (i >= layer * 2 && (i - layer * 2) % 4 < 2);
      p.setZ(i, Math.min(p.getZ(i), hit.point.z - (front ? 0.01 : 0.004)));
    }
    ob.geometry.computeVertexNormals();
  }
  // Two weighted cloth panels, not a stack of pointed triangular paper shards.
  for (const side of [-1, 1]) {
    const points: number[] = [],
      tex: number[] = [],
      indices: number[] = [];
    const cols = 8,
      rows = 8,
      layerCount = (cols + 1) * (rows + 1);
    for (let back = 0; back < 2; back++)
      for (let j = 0; j <= rows; j++)
        for (let i = 0; i <= cols; i++) {
          const u = i / cols,
            v = j / rows;
          const x =
            side < 0
              ? -(0.1 + u * 0.26) * (1 - v) + (0.18 - u * 0.18) * v
              : side * (0.1 + 0.13 * v + u * (0.26 - 0.08 * v));
          const hem =
            (side < 0 ? -0.2 - 0.06 * u : -0.4) - 0.035 * Math.sin(u * Math.PI) - 0.018 * Math.sin(u * Math.PI * 3);
          const y = (0.2 - 0.08 * u) * (1 - v) + hem * v;
          const bodyZ = -0.285 + 0.09 * (Math.abs(x) / 0.5) ** 2 + 0.02 * v;
          const fold = 0.045 * Math.sin(u * Math.PI * 2 + v * 1.2) * THREE.MathUtils.smoothstep(v, 0, 0.3);
          const drop = THREE.MathUtils.smoothstep(v, 0, 0.28);
          const z = -0.15 * (1 - drop) + (bodyZ - 0.025 - fold) * drop - 0.045 * v * v + back * 0.009;
          points.push(x, y, z);
          tex.push(u, v);
        }
    for (let back = 0; back < 2; back++)
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
          const a = back * layerCount + j * (cols + 1) + i,
            b = a + cols + 1;
          const face = [a, b, a + 1, a + 1, b, b + 1];
          if (side > 0 !== back > 0) face.reverse();
          indices.push(...face);
        }
    const rim: number[] = [];
    for (let i = 0; i <= cols; i++) rim.push(i);
    for (let j = 1; j <= rows; j++) rim.push(j * (cols + 1) + cols);
    for (let i = cols - 1; i >= 0; i--) rim.push(rows * (cols + 1) + i);
    for (let j = rows - 1; j > 0; j--) rim.push(j * (cols + 1));
    for (let i = 0; i < rim.length; i++) {
      const a = rim[i],
        b = rim[(i + 1) % rim.length];
      indices.push(a, b, a + layerCount, b, b + layerCount, a + layerCount);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(tex, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    k.mesh(g, 0x777071).name = 'weighted-folded-ragged-shroud';
  }
  dressGhoulCloth(k.group);
  return k.group;
}
export function werewolf(): THREE.Group {
  const k = new CastleKit();
  k.group.name = 'werewolfChief';
  const chest = k.form(
    fur,
    [
      [1.0, 0.25, 0.19, 0, 0.12],
      [1.2, 0.3, 0.22, 0, 0.08],
      [1.52, 0.37, 0.27, 0, 0],
      [1.88, 0.56, 0.31, 0, -0.1],
      [2.12, 0.57, 0.29, 0, -0.17],
      [2.31, 0.38, 0.24, 0, -0.2],
      [2.46, 0.24, 0.18, 0, -0.24],
      [2.54, 0, 0, 0, -0.25],
    ],
    'continuous-forward-leaning-V-torso',
    22,
    26,
  );
  const chestP = chest.geometry.getAttribute('position');
  for (let i = 0; i < chestP.count; i++) {
    const x = chestP.getX(i),
      y = chestP.getY(i),
      z = chestP.getZ(i);
    const front = THREE.MathUtils.smoothstep(-z, 0.05, 0.28);
    const pec = Math.exp(-(((Math.abs(x) - 0.25) / 0.2) ** 2) - ((y - 1.98) / 0.19) ** 2);
    const sternum = Math.exp(-((x / 0.065) ** 2) - ((y - 1.94) / 0.3) ** 2);
    chestP.setZ(i, z - front * (0.07 * pec - 0.038 * sternum));
  }
  chest.geometry.computeVertexNormals();
  for (const side of [-1, 1]) {
    k.path(
      fur,
      [
        [side * 0.18, 1.35, 0.1],
        [side * 0.43, 0.84, 0.04],
        [side * 0.49, 0.53, 0.23],
        [side * 0.59, 0.25, 0.06],
        [side * 0.61, 0.18, -0.015],
      ],
      [0.14, 0.2, 0.12, 0.09, 0.085],
      [0.14, 0.22, 0.13, 0.1, 0.09],
      'spring-loaded-digitigrade-leg',
      20,
      12,
    );
    k.form(
      fur,
      [
        [0, 0, 0, side * 0.62, -0.08],
        [0.006, 0.14, 0.22, side * 0.62, -0.08],
        [0.055, 0.165, 0.235, side * 0.62, -0.075],
        [0.12, 0.145, 0.2, side * 0.62, -0.05],
        [0.22, 0.095, 0.105, side * 0.605, 0.025],
        [0.32, 0.075, 0.075, side * 0.595, 0.065],
        [0.35, 0, 0, side * 0.59, 0.07],
      ],
      'planted-toe-bearing-paw',
      14,
      16,
    );
    for (let toe = 0; toe < 3; toe++)
      k.path(
        bone,
        [
          [side * 0.62 + (toe - 1) * 0.07, 0.08, -0.27],
          [side * 0.62 + (toe - 1) * 0.07, 0.05, -0.315],
          [side * 0.62 + (toe - 1) * 0.07, 0.025, -0.35],
        ],
        [0.028, 0.022, 0],
        undefined,
        'grounded-foot-claw',
        8,
        7,
      );
    const raised = side < 0;
    const elbow: Vec3 = raised ? [-0.8, 1.95, -0.31] : [0.76, 1.53, -0.08];
    const palm: Vec3 = raised ? [-1.02, 1.8, -0.6] : [0.99, 0.99, -0.35];
    k.path(
      fur,
      [[side * 0.35, 2.16, -0.12], elbow, palm],
      [0.17, 0.22, 0.15, 0.11],
      [0.23, 0.2, 0.15, 0.12],
      'continuous-shoulder-to-long-forearm',
      22,
      12,
    );
    const handStart = k.group.children.length;
    k.path(
      fur,
      [[palm[0], palm[1] + 0.07, palm[2] + 0.02], palm, [palm[0], palm[1] - 0.14, palm[2] - 0.04]],
      [0.13, 0.16, 0.1],
      [0.1, 0.11, 0.07],
      'clawed-hand-palm',
      10,
      10,
    );
    for (let digit = 0; digit < 4; digit++) {
      const dx = (digit - 1.5) * 0.07,
        xx = palm[0] + dx;
      k.path(
        fur,
        [
          [xx, palm[1] - 0.09, palm[2] - 0.025],
          [xx + dx * 0.7 + side * 0.025, palm[1] - 0.23 + Math.abs(dx) * 0.2, palm[2] - 0.09],
          [xx + dx * 0.95 + side * 0.015, palm[1] - 0.3 + Math.abs(dx) * 0.3, palm[2] - 0.19],
        ],
        [0.038, 0.033, 0.023],
        [0.03, 0.028, 0.018],
        'articulated-werewolf-digit',
        10,
        7,
      );
      k.path(
        bone,
        [
          [xx + dx * 0.95 + side * 0.015, palm[1] - 0.29 + Math.abs(dx) * 0.3, palm[2] - 0.18],
          [xx + dx * 0.95, palm[1] - 0.31 + Math.abs(dx) * 0.3, palm[2] - 0.28],
          [xx + dx * 0.95 - side * 0.02, palm[1] - 0.26 + Math.abs(dx) * 0.3, palm[2] - 0.32],
        ],
        [0.027, 0.018, 0],
        undefined,
        'swept-finger-claw',
        8,
        6,
      );
    }
    k.path(
      fur,
      [
        [palm[0] - side * 0.11, palm[1], palm[2]],
        [palm[0] - side * 0.23, palm[1] - 0.05, palm[2] - 0.15],
        [palm[0] - side * 0.2, palm[1] - 0.16, palm[2] - 0.22],
      ],
      [0.05, 0.04, 0.01],
      undefined,
      'opposed-claw-thumb',
      10,
      8,
    );
    if (raised)
      for (const ob of k.group.children.slice(handStart + 1))
        if (ob instanceof THREE.Mesh) {
          ob.geometry.translate(-palm[0], -palm[1], -palm[2]);
          ob.geometry.rotateX(-0.35);
          ob.geometry.translate(...palm);
        }
    for (let i = 0; i < 3; i++)
      k.path(
        i % 2 ? 0x625c60 : dark,
        [
          [side * (0.28 + i * 0.045), 2.3 - i * 0.05, -0.18],
          [side * (0.45 + i * 0.06), 2.22 - i * 0.08, -0.22],
          [side * (0.7 + i * 0.06), 2.19 - i * 0.12, -0.08],
        ],
        [0.05, 0.075, 0],
        [0.035, 0.05, 0],
        'rooted-curved-shoulder-mane',
        10,
        7,
      );
    for (let i = 0; i < 2; i++)
      leaf(
        k,
        dark,
        [elbow[0] * 0.6 + palm[0] * 0.4, elbow[1] * 0.6 + palm[1] * 0.4 - i * 0.07, elbow[2] * 0.6 + palm[2] * 0.4],
        [
          elbow[0] * 0.4 + palm[0] * 0.6,
          elbow[1] * 0.4 + palm[1] * 0.6 - i * 0.07,
          elbow[2] * 0.4 + palm[2] * 0.6 - 0.07,
        ],
        [palm[0] + side * 0.12, palm[1] + 0.22 - i * 0.12, palm[2] + 0.03],
        0.025,
        'forearm-fur',
      );
  }
  const head = k.mesh(
    loftGeometry(
      [
        [-0.8, 0, 0, 0, -2.48],
        [-0.76, 0.13, 0.09, 0, -2.48],
        [-0.61, 0.145, 0.11, 0, -2.53],
        [-0.45, 0.19, 0.17, 0, -2.64],
        [-0.26, 0.27, 0.19, 0, -2.65],
        [-0.09, 0.19, 0.17, 0, -2.6],
        [0.02, 0, 0, 0, -2.54],
      ],
      24,
      20,
    ).rotateX(Math.PI / 2),
    fur,
  );
  head.name = 'continuous-werewolf-skull-and-long-muzzle';
  const skullP = head.geometry.getAttribute('position');
  for (let i = 0; i < skullP.count; i++) {
    const x = skullP.getX(i),
      y = skullP.getY(i),
      z = skullP.getZ(i);
    const brow = Math.exp(-(((Math.abs(x) - 0.13) / 0.075) ** 2) - ((y - 2.72) / 0.06) ** 2);
    const cheek = Math.exp(-(((Math.abs(x) - 0.19) / 0.06) ** 2) - ((y - 2.57) / 0.09) ** 2);
    const front = THREE.MathUtils.smoothstep(-z, 0.22, 0.43);
    const orbit = Math.exp(-(((Math.abs(x) - 0.135) / 0.07) ** 2) - ((y - 2.685) / 0.034) ** 2);
    const roof = Math.exp(-(((Math.abs(x) - 0.135) / 0.09) ** 2) - ((y - 2.715) / 0.028) ** 2);
    let shapedZ = z - front * (0.02 * brow + 0.026 * cheek + 0.028 * roof - 0.036 * orbit);
    // The upper lip is sculpted in the continuous skull surface, not an
    // intersecting pad. It provides actual support at the canine roots.
    if (z < -0.65 && Math.abs(x) < 0.16) {
      const lip = Math.exp(-(((y - 2.45) / 0.027) ** 2)) * (1 - THREE.MathUtils.smoothstep(Math.abs(x), 0.12, 0.16));
      const target = -0.81 + 0.012 * (x / 0.15) ** 2;
      shapedZ = THREE.MathUtils.lerp(shapedZ, Math.min(shapedZ, target), lip);
    }
    skullP.setZ(i, shapedZ);
    if (y > 2.72) skullP.setY(i, 2.72 + (y - 2.72) * 0.65);
  }
  head.geometry.computeVertexNormals();
  // A coherent shoulder-to-occiput mantle supports the swept locks; no floating horn comb.
  const mane = k.form(
    dark,
    [
      [1.96, 0, 0, 0, 0.16],
      [2.06, 0.34, 0.19, 0, 0.12],
      [2.24, 0.55, 0.24, 0, 0.08],
      [2.49, 0.43, 0.28, 0, 0.05],
      [2.73, 0.27, 0.24, 0, 0.02],
      [2.86, 0.12, 0.12, 0, 0.01],
      [2.9, 0, 0, 0, 0.01],
    ],
    'continuous-swept-occipital-mane',
    18,
    16,
  );
  const mp = mane.geometry.getAttribute('position');
  for (let i = 0; i < mp.count; i++) {
    const x = mp.getX(i),
      y = mp.getY(i),
      z = mp.getZ(i),
      angle = Math.atan2(x, z - 0.07);
    const relief =
      0.018 * Math.sin(angle * 7 + y * 8) * Math.sin(Math.PI * THREE.MathUtils.clamp((y - 1.96) / 0.94, 0, 1));
    mp.setXYZ(i, x + Math.sin(angle) * relief, y, z + Math.cos(angle) * relief);
  }
  mane.geometry.computeVertexNormals();
  mane.updateMatrixWorld(true);
  const maneRay = new THREE.Raycaster();
  for (let row = 0; row < 3; row++)
    for (let column = 0; column < 5; column++) {
      const angle = -1.3 + column * 0.65 + (row % 2) * 0.1;
      const radial = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
      const y = 2.69 - row * 0.19;
      maneRay.set(new THREE.Vector3(radial.x * 3, y, 0.07 + radial.z * 3), radial.clone().negate());
      const hit = maneRay.intersectObject(mane)[0];
      if (!hit) throw new Error('Werewolf mane lock misses continuous mantle');
      const root = hit.point.clone().addScaledVector(radial, -0.018);
      const mid = root.clone().addScaledVector(radial, 0.055);
      mid.y -= 0.07;
      const tip = root.clone().addScaledVector(radial, 0.11);
      tip.y -= 0.23;
      k.path(
        column % 2 ? 0x39343a : 0x454047,
        [root.toArray(), mid.toArray(), tip.toArray()],
        [0.07, 0.095, 0],
        [0.012, 0.018, 0],
        'overlapping-swept-mane-plume',
        5,
        5,
      );
    }
  // Staggered, overlapping swept mane masses; no evenly spaced comb of rods.
  const crownLocks: [number, number, number, number, number, number][] = [
    [0, 2.72, -0.4, 0.01, 2.85, 0.36],
    [-0.09, 2.71, -0.4, -0.22, 2.8, 0.31],
    [0.09, 2.72, -0.4, 0.24, 2.82, 0.34],
    [-0.17, 2.67, -0.13, -0.39, 2.74, 0.3],
    [0.17, 2.69, -0.12, 0.4, 2.76, 0.34],
    [-0.12, 2.73, 0.0, -0.27, 2.8, 0.47],
    [0.13, 2.74, 0.02, 0.3, 2.83, 0.49],
  ];
  for (const [x, y, z, tx, ty, tz] of crownLocks)
    k.path(
      dark,
      [
        [x, y, z],
        [(x + tx) * 0.5, (y + ty) * 0.5 + 0.035, (z + tz) * 0.5],
        [tx, ty, tz],
      ],
      [0.075, 0.1, 0],
      [0.018, 0.025, 0],
      'swept-cranial-fur-lock',
      8,
      6,
    );
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++) {
      k.path(
        i === 0 ? 0x696164 : fur,
        [
          [side * (0.1 + i * 0.07), 2.2 - i * 0.085, -0.3],
          [side * (0.17 + i * 0.075), 2.07 - i * 0.1, -0.43],
          [side * (0.23 + i * 0.09), 1.94 - i * 0.11, -0.28],
        ],
        [0.055, 0.065, 0],
        [0.045, 0.04, 0],
        'embedded-chest-ruff-lock',
        7,
        6,
      );
    }
  for (const o of [head, chest]) {
    const p = o.geometry.getAttribute('position'),
      colors: number[] = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      const mask =
        o === head
          ? THREE.MathUtils.smoothstep(-z, 0.4, 0.75) * (1 - THREE.MathUtils.smoothstep(y, 2.53, 2.72))
          : Math.exp(-((x / 0.38) ** 2)) * THREE.MathUtils.smoothstep(-z, 0.15, 0.35);
      const c = new THREE.Color(fur).lerp(new THREE.Color(0x9c9390), mask * 0.72);
      if (o === head) {
        const orbital = Math.exp(-(((Math.abs(x) - 0.135) / 0.065) ** 2) - ((y - 2.685) / 0.045) ** 2);
        c.multiplyScalar(1 - 0.45 * orbital);
      }
      colors.push(c.r, c.g, c.b);
    }
    o.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const m = (o.material as THREE.MeshStandardMaterial).clone();
    m.color.set(0xffffff);
    m.vertexColors = true;
    m.roughness = 0.87;
    o.material = m;
  }

  for (const side of [-1, 1]) {
    leaf(
      k,
      dark,
      [side * 0.13, 2.76, -0.25],
      [side * 0.25, 2.71, -0.13],
      [side * 0.31, 2.95, 0.02],
      0.028,
      'pointed-werewolf-ear',
    );
    leaf(
      k,
      0x79646a,
      [side * 0.16, 2.79, -0.28],
      [side * 0.23, 2.77, -0.18],
      [side * 0.28, 2.9, 0],
      0.008,
      'werewolf-inner-ear',
    );
    embeddedPredatorEye(k, head, side, 0.135, 2.685, 1.15, 'werewolf');
    for (let i = 0; i < 5; i++)
      k.path(
        i ? fur : 0x777071,
        [
          [side * 0.1, 2.75 - i * 0.065, -0.3 + i * 0.03],
          [side * (0.25 + i * 0.015), 2.65 - i * 0.09, -0.4 + i * 0.025],
          [side * (0.37 + i * 0.02), 2.55 - i * 0.12, -0.18 + i * 0.03],
        ],
        [0.03, 0.065, 0],
        [0.03, 0.045, 0],
        'buried-root-swept-cheek-mane',
        12,
        7,
      );
  }
  k.form(
    dark,
    [
      [2.495, 0.08, 0.025, 0, -0.77],
      [2.53, 0.105, 0.035, 0, -0.77],
      [2.56, 0.08, 0.025, 0, -0.76],
      [2.575, 0, 0, 0, -0.74],
    ],
    'canine-nose-leather',
    12,
    10,
  );
  k.form(
    0x211b20,
    [
      [2.35, 0, 0, 0, -0.77],
      [2.375, 0.105, 0.025, 0, -0.77],
      [2.43, 0.145, 0.03, 0, -0.77],
      [2.47, 0.1, 0.02, 0, -0.75],
      [2.48, 0, 0, 0, -0.75],
    ],
    'open-dark-jaw-interior',
    16,
    12,
  );
  k.form(
    0x8a8180,
    [
      [2.305, 0, 0, 0, -0.59],
      [2.33, 0.1, 0.14, 0, -0.61],
      [2.365, 0.14, 0.16, 0, -0.6],
      [2.385, 0.13, 0.13, 0, -0.6],
      [2.4, 0, 0, 0, -0.58],
    ],
    'connected-lower-jaw',
    16,
    12,
  );
  for (const side of [-1, 1])
    for (let i = 0; i < 2; i++)
      k.path(
        bone,
        [
          [side * (i === 0 ? 0.1 : 0.035), 2.448, -0.802],
          [side * (i === 0 ? 0.1 : 0.035), i === 0 ? 2.375 : 2.423, -0.805],
        ],
        [i === 0 ? 0.018 : 0.012, 0],
        undefined,
        'seated-snarling-fang',
        5,
        7,
      );
  // Overlapping leather harness and tailored sash stay tied to actual torso surface.
  patch(
    k,
    chest,
    leather,
    [
      [-0.43, 2.16],
      [-0.32, 2.23],
      [0.3, 1.3],
      [0.21, 1.23],
    ],
    0.025,
    'diagonal-chief-harness',
  );
  k.form(
    crimson,
    [
      [1.18, 0.31, 0.225, 0, 0.08],
      [1.29, 0.325, 0.24, 0, 0.06],
      [1.39, 0.33, 0.24, 0, 0.04],
    ],
    'wrapped-chief-waist-sash',
    18,
    8,
  );
  for (let i = 0; i < 3; i++)
    leaf(
      k,
      crimson,
      [-0.3 + i * 0.2, 1.3, -0.19],
      [-0.12 + i * 0.2, 1.3, -0.2],
      [-0.32 + i * 0.27, 0.62 + (i % 2) * 0.17, -0.28],
      0.028,
      'layered-chief-sash',
    );
  k.box(0x9d825f, [0, 1.33, -0.25], [0.18, 0.15, 0.04], k.group, 0.025, 'metal');
  leaf(k, bone, [-0.07, 1.36, -0.28], [0.07, 1.36, -0.28], [0, 1.25, -0.3], 0.01, 'chief-buckle-crest');
  k.path(
    fur,
    [
      [0, 1.09, 0.24],
      [0.2, 0.9, 0.46],
      [0.36, 0.7, 0.63],
      [0.44, 0.73, 0.85],
    ],
    [0.16, 0.19, 0.17, 0],
    [0.15, 0.17, 0.14, 0],
    'werewolf-swept-tail',
    18,
    12,
  );
  k.group.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.updateMatrix();
    o.geometry.applyMatrix4(o.matrix);
    o.position.set(0, 0, 0);
    o.rotation.set(0, 0, 0);
    o.scale.set(1, 1, 1);
    o.updateMatrix();
    const p = o.geometry.getAttribute('position');
    // Pose the articulated head rigidly. The former whole-body hunch field had
    // a y derivative near0.4 across the face, flattening eyes/nose/jaw into bars.
    const headPart =
      o === head ||
      /werewolf-(amber-eye|pupil|continuous-orbital)|pointed-werewolf-ear|werewolf-inner-ear|swept-cranial-fur-lock|buried-root-swept-cheek-mane|wolf-jaw-mouth-line|integrated-jaw-fang|canine-nose-leather|connected-snarling-mouth|connected-upper-muzzle-lip|open-dark-jaw-interior|connected-lower-jaw|seated-snarling-fang/.test(
        o.name,
      );
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (headPart) {
        p.setY(i, y - 0.3);
        p.setZ(i, p.getZ(i) - 0.21);
      } else {
        const w = THREE.MathUtils.smoothstep(y, 0.8, 1.9);
        p.setY(i, y - 0.19 * w - 0.16 * THREE.MathUtils.smoothstep(y, 2.35, 2.75));
        p.setZ(i, p.getZ(i) - 0.12 * w - 0.1 * THREE.MathUtils.smoothstep(y, 2.3, 2.7));
      }
    }
    if (!headPart) o.geometry.computeVertexNormals();
    o.geometry.computeBoundingBox();
    o.geometry.computeBoundingSphere();
  });
  dressCastleBeast(k.group);
  return k.group;
}
