import { schoolGirlCrown } from './generated/schoolGirlCrown';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SculptKit } from '../../SculptKit';
import type { Vec3, Surface } from '../../ModelKit';
import { schoolBookCoverData } from './schoolBookGeometry';
import { schoolPencilShaftData } from './schoolPencilGeometry';
import { dressSchoolCreature } from './schoolSurfaceArt';
import { buildSchoolAuthoredFace } from './SchoolAuthoredFace';

/** School adversaries, rebuilt from the approved 2026-10-31 concept board.
 * Authored primary volumes and small identity details; no old chibi builders. Front -Z. */
const C = {
  leather: 0x302438,
  edge: 0x151720,
  gold: 0xa48547,
  lightGold: 0xd6b56b,
  paper: 0xd8cdb3,
  ink: 0x34293c,
  violet: 0x69518e,
  glow: 0xf8b949,
  cloth: 0x27312f,
  black: 0x151620,
  ivory: 0xd1cbc0,
  face: 0xbcb7bc,
};
function name<T extends THREE.Object3D>(o: T, n: string): T {
  o.name = n;
  return o;
}
function block(k: SculptKit, c: number, p: Vec3, s: Vec3, parent = k.group, surface: Surface = 'cloth', bevel = 0.012) {
  return k.box(c, p, s, parent, bevel, surface);
}
function ribbon(
  k: SculptKit,
  c: number,
  points: readonly Vec3[],
  widths: readonly number[],
  depths: readonly number[],
  parent = k.group,
  steps = 14,
  surface: Surface = 'cloth',
) {
  const mesh = k.sweep(c, points, widths, depths, parent, surface, steps);
  return c === C.violet ? closeSweepEnds(mesh) : mesh;
}
function plate(
  k: SculptKit,
  c: number,
  points: readonly (readonly [number, number])[],
  depth: number,
  p: Vec3,
  parent = k.group,
  surface: Surface = 'cloth',
) {
  const shape = new THREE.Shape();
  shape.moveTo(...points[0]);
  for (const q of points.slice(1)) shape.lineTo(...q);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSize: Math.min(0.008, depth * 0.3),
    bevelThickness: Math.min(0.006, depth * 0.25),
    bevelSegments: 1,
    curveSegments: 5,
  });
  return k.mesh(g, c, p, [1, 1, 1], parent, surface);
}
/** Tessellate front faces before projection: corner-only plates cut through a curved chest. */
function conformFront(mesh: THREE.Mesh, target: THREE.Mesh, clearance = 0.009, smooth = false) {
  mesh.updateMatrixWorld(true);
  target.updateMatrixWorld(true);
  const source = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone(),
    pos = source.getAttribute('position');
  const vertices: number[] = [],
    uv: number[] = [];
  const ray = new THREE.Raycaster();
  const inverse = mesh.matrixWorld.clone().invert();
  const emit = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, depth: number) => {
    if (depth > 0) {
      const ab = a.clone().lerp(b, 0.5),
        bc = b.clone().lerp(c, 0.5),
        ca = c.clone().lerp(a, 0.5);
      emit(a, ab, ca, depth - 1);
      emit(ab, b, bc, depth - 1);
      emit(ca, bc, c, depth - 1);
      emit(ab, bc, ca, depth - 1);
      return;
    }
    for (const v of [a, b, c]) {
      const world = v.clone().applyMatrix4(mesh.matrixWorld);
      ray.set(new THREE.Vector3(world.x, world.y, -5), new THREE.Vector3(0, 0, 1));
      const hit = ray.intersectObject(target, false)[0];
      if (hit) world.z = hit.point.z - clearance;
      else world.z = Math.max(world.z, -0.16);
      world.applyMatrix4(inverse);
      vertices.push(...world.toArray());
      uv.push(world.x, world.y);
    }
  };
  for (let i = 0; i < pos.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, i),
      b = new THREE.Vector3().fromBufferAttribute(pos, i + 1),
      c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
    if (b.clone().sub(a).cross(c.clone().sub(a)).normalize().z < -0.7) emit(a, b, c, 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  mesh.geometry.dispose();
  source.dispose();
  if (smooth) {
    // Conformed cloth is a continuous curved patch, not disconnected flat triangle tiles.
    g.deleteAttribute('normal');
    const welded = mergeVertices(g, 1e-5);
    welded.computeVertexNormals();
    g.dispose();
    mesh.geometry = welded;
  } else mesh.geometry = g;
}
function closeSweepEnds(mesh: THREE.Mesh, sides = 12, invertCaps = false) {
  const g = mesh.geometry,
    p = g.getAttribute('position'),
    stride = sides + 1;
  const arrays: Record<string, number[]> = {};
  for (const [name, attr] of Object.entries(g.attributes)) arrays[name] = Array.from(attr.array);
  const indices = Array.from(g.index!.array);
  for (const [start, reverse] of [
    [0, true],
    [p.count - stride, false],
  ] as const) {
    const center = new THREE.Vector3();
    for (let j = 0; j < sides; j++) center.add(new THREE.Vector3().fromBufferAttribute(p, start + j));
    center.divideScalar(sides);
    if (center.distanceTo(new THREE.Vector3().fromBufferAttribute(p, start)) < 1e-7) continue;
    const newIndex = arrays.position.length / 3;
    for (const [name, attr] of Object.entries(g.attributes))
      for (let component = 0; component < attr.itemSize; component++) {
        let mean = 0;
        for (let j = 0; j < sides; j++) mean += attr.array[(start + j) * attr.itemSize + component];
        arrays[name].push(mean / sides);
      }
    for (let j = 0; j < sides; j++)
      indices.push(
        newIndex,
        start + j + (reverse !== invertCaps ? 1 : 0),
        start + j + (reverse !== invertCaps ? 0 : 1),
      );
  }
  for (const [name, attr] of Object.entries(g.attributes))
    g.setAttribute(name, new THREE.Float32BufferAttribute(arrays[name], attr.itemSize));
  g.setIndex(indices);
  g.computeVertexNormals();
  const n = g.getAttribute('normal');
  for (let start = 0; start < p.count; start += stride) {
    const avg = new THREE.Vector3(
      n.getX(start) + n.getX(start + sides),
      n.getY(start) + n.getY(start + sides),
      n.getZ(start) + n.getZ(start + sides),
    ).normalize();
    n.setXYZ(start, ...avg.toArray());
    n.setXYZ(start + sides, ...avg.toArray());
  }
  return mesh;
}
function frontPoints(target: THREE.Mesh, points: Vec3[], clearance = 0.022): Vec3[] {
  target.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  return points.map(([x, y, z]) => {
    ray.set(new THREE.Vector3(x, y, -5), new THREE.Vector3(0, 0, 1));
    const hit = ray.intersectObject(target, false)[0];
    return [x, y, hit ? hit.point.z - clearance : z];
  });
}
function stud(k: SculptKit, c: number, p: Vec3, r = 0.018, parent = k.group) {
  return k.sphere(c, p, [r, r, r * 0.42], parent, 6, 'metal');
}
function eye(
  k: SculptKit,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  c: number,
  parent = k.group,
  side = 1,
) {
  return name(
    plate(
      k,
      c,
      [
        [-width / 2, height * 0.35],
        [-width * 0.15, height * 0.48],
        [width / 2, -height * 0.12],
        [width * 0.22, -height * 0.48],
        [-width * 0.35, -height * 0.3],
      ],
      0.006,
      [x, y, z],
      parent,
      'glow',
    ),
    `focused-eye-${side}`,
  );
}
function hand(k: SculptKit, p: Vec3, gesture: 'chalk' | 'spell', parent = k.group) {
  const h = new THREE.Group();
  h.position.set(...p);
  parent.add(h);
  name(
    k.loft(
      C.face,
      [
        [-0.105, 0.028, 0.023],
        [-0.06, 0.04, 0.026],
        [0.01, 0.058, 0.035],
        [0.075, 0.05, 0.028],
        [0.09, 0, 0],
      ],
      undefined,
      h,
      'cloth',
      10,
      12,
    ),
    'tapered-palm',
  );
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * 0.027,
      length = [0.105, 0.145, 0.13, 0.095][i];
    const points: Vec3[] =
      gesture === 'chalk'
        ? [
            [0.042, 0.035 + x, -0.012],
            [0.047, 0.035 + x, -0.065],
            [0.005, 0.035 + x, -0.103],
            [-0.031, 0.035 + x, -0.072],
          ]
        : [
            [x, 0.055, 0],
            [x * 1.4, 0.105, -0.025],
            [x * 1.8, 0.08 + length, -0.065],
            [x * 2, 0.085 + length, -0.095],
          ];
    name(
      closeSweepEnds(ribbon(k, C.face, points, [0.016, 0.014, 0.011, 0.007], [0.013, 0.012, 0.009, 0.005], h, 10)),
      `individual-finger-${i}`,
    );
  }
  ribbon(
    k,
    C.face,
    [
      [-0.04, -0.015, 0],
      [-0.085, 0.015, -0.035],
      [-0.067, 0.052, -0.075],
    ],
    [0.022, 0.018, 0.009],
    [0.019, 0.014, 0.007],
    h,
    9,
  );
  return h;
}
function bookGhost(): THREE.Group {
  const k = new SculptKit();
  k.group.name = 'bookGhost';
  const body = new THREE.Group();
  body.rotation.z = -0.1;
  k.group.add(body);
  const left = new THREE.Group();
  left.position.set(-0.08, 0.06, -0.015);
  left.rotation.y = -0.12;
  body.add(left);
  const coverGeometry = new THREE.BufferGeometry();
  coverGeometry.setAttribute('position', new THREE.Float32BufferAttribute(schoolBookCoverData.position, 3));
  coverGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(schoolBookCoverData.normal, 3));
  coverGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(schoolBookCoverData.uv, 2));
  name(k.mesh(coverGeometry, C.leather, undefined, undefined, left), 'authored-carved-leather-front-cover');
  block(k, C.edge, [-0.14, 0, 0.07], [0.68, 0.87, 0.035], left);
  // Six thick page strata, each bevelled and staggered, rather than a painted white cube.
  for (let i = 0; i < 7; i++) {
    const page = block(
      k,
      i % 2 ? C.paper : 0xc4b89e,
      [-0.11 + i * 0.011, 0, 0.09 + i * 0.018],
      [0.59, 0.76, 0.013],
      left,
      'cloth',
      0.004,
    );
    const pp = page.geometry.getAttribute('position');
    for (let vi = 0; vi < pp.count; vi++) {
      const px = pp.getX(vi),
        py = pp.getY(vi),
        pz = pp.getZ(vi);
      const corner = Math.max(0, (Math.abs(py) - 0.22) / 0.16) * Math.max(0, (px + 0.08) / 0.36);
      pp.setZ(vi, pz + corner * (i % 2 ? -0.012 : 0.016));
    }
    page.geometry.computeVertexNormals();
    page.rotation.y = i * 0.013;
  }
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      const x = -0.14 + sx * 0.275,
        y = sy * 0.36;
      name(
        plate(
          k,
          C.gold,
          [
            [0, 0],
            [-sx * 0.11, 0],
            [-sx * 0.03, -sy * 0.045],
            [0, -sy * 0.12],
          ],
          0.022,
          [x, y, -0.06],
          left,
          'metal',
        ),
        'brass-corner-clasp',
      );
      // Back of each rivet overlaps its actual bracket front by1mm, rather than floating in air.
      name(stud(k, C.lightGold, [x - sx * 0.025, y - sy * 0.025, -0.0696], 0.014, left), 'seated-book-corner-rivet');
    }
  for (const x of [-0.39, 0.1]) {
    name(block(k, C.gold, [x, 0, -0.059], [0.018, 0.58, 0.015], left, 'metal', 0.003), 'brass-book-mounting-rail');
    for (const y of [-0.2, 0, 0.2]) name(stud(k, C.lightGold, [x, y, -0.0699], 0.012, left), 'seated-book-rail-rivet');
  }
  const socket = C.edge;
  for (const s of [-1, 1]) {
    const x = -0.14 + s * 0.095;
    plate(
      k,
      socket,
      [
        [-0.095, 0.043],
        [0.088, 0.055],
        [0.07, -0.025],
        [-0.07, -0.035],
      ],
      0.009,
      [x, 0.095, 0.028],
      left,
    );
    const e = eye(k, x, 0.095, -0.008, 0.105, 0.045, C.glow, left, s);
    e.rotation.z = s * 0.22;
  }
  // Inlaid split mouth and a single oversized diamond lock are readable at distance.
  plate(
    k,
    C.edge,
    [
      [-0.15, 0.018],
      [-0.08, -0.006],
      [-0.025, 0.007],
      [0.03, -0.016],
      [0.11, 0.005],
      [0.15, -0.025],
      [0.1, -0.05],
      [-0.12, -0.04],
    ],
    0.008,
    [-0.14, -0.075, 0.028],
    left,
  );
  plate(
    k,
    C.gold,
    [
      [0, 0.092],
      [0.062, 0],
      [0, -0.095],
      [-0.062, 0],
    ],
    0.025,
    [-0.14, -0.255, -0.075],
    left,
    'metal',
  );
  plate(
    k,
    C.leather,
    [
      [0, 0.055],
      [0.032, 0],
      [0, -0.055],
      [-0.032, 0],
    ],
    0.01,
    [-0.14, -0.255, -0.104],
    left,
  );
  // Exposed opening fan is one coherent page stack on the opposite side of the spine.
  for (let i = 0; i < 6; i++) {
    const fan = new THREE.Group();
    fan.position.set(0.19, 0.045, 0.075);
    fan.rotation.y = -0.2 - i * 0.075;
    fan.rotation.z = -0.03 + i * 0.025;
    body.add(fan);
    plate(
      k,
      i % 2 ? C.paper : 0xe5dcc7,
      [
        [0, -0.355],
        [0.3, -0.3],
        [0.35, 0.33],
        [0.04, 0.39],
      ],
      0.009,
      [0, 0, 0],
      fan,
    );
    if (i === 0 || i === 3) {
      const positions: number[] = [];
      for (let j = 0; j < 12; j++) {
        const a = (j / 12) * Math.PI * 2,
          b = ((j + 1) / 12) * Math.PI * 2;
        const q = [
          [0.17 + 0.065 * Math.cos(a), -0.08 + 0.065 * Math.sin(a)],
          [0.17 + 0.065 * Math.cos(b), -0.08 + 0.065 * Math.sin(b)],
          [0.17 + 0.06 * Math.cos(b), -0.08 + 0.06 * Math.sin(b)],
          [0.17 + 0.06 * Math.cos(a), -0.08 + 0.06 * Math.sin(a)],
        ];
        for (const n of [0, 2, 1, 0, 3, 2]) positions.push(q[n][0], q[n][1], -0.014);
      }
      const ink = new THREE.BufferGeometry();
      ink.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      ink.computeVertexNormals();
      k.mesh(ink, 0x807565, undefined, undefined, fan);
    }
    for (let line = 0; line < 3; line++) {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0.08, 0.16 - line * 0.12, -0.014),
        new THREE.Vector3(0.18, 0.18 - line * 0.12, -0.014),
        new THREE.Vector3(0.27, 0.15 - line * 0.12, -0.014),
      );
      const data: number[] = [];
      for (let i = 0; i < 8; i++) {
        const a = curve.getPoint(i / 8),
          b = curve.getPoint((i + 1) / 8),
          d = b.clone().sub(a).normalize(),
          n = new THREE.Vector3(-d.y, d.x, 0).multiplyScalar(0.002);
        const q = [a.clone().add(n), b.clone().add(n), b.clone().sub(n), a.clone().sub(n)];
        for (const j of [0, 2, 1, 0, 3, 2]) data.push(...q[j].toArray());
      }
      const inkG = new THREE.BufferGeometry();
      inkG.setAttribute('position', new THREE.Float32BufferAttribute(data, 3));
      inkG.computeVertexNormals();
      k.mesh(inkG, 0x807565, undefined, undefined, fan);
    }
  }
  name(
    k.loft(
      0x423047,
      [
        [-0.45, 0, 0],
        [-0.4, 0.07, 0.12],
        [0.35, 0.07, 0.12],
        [0.46, 0, 0],
      ],
      [0.19, 0.02, 0.04],
      body,
      'leather',
      12,
      12,
    ),
    'bound-spine',
  );
  for (const y of [-0.26, 0.05, 0.32]) block(k, C.gold, [0.19, y, -0.09], [0.16, 0.035, 0.025], body, 'metal', 0.006);
  name(
    ribbon(
      k,
      C.violet,
      [
        [0.15, -0.35, 0.1],
        [0.04, -0.47, 0.13],
        [-0.27, -0.49, 0.14],
        [-0.46, -0.42, 0.12],
        [-0.49, -0.3, 0.1],
      ],
      [0.12, 0.1, 0.06, 0.025, 0],
      [0.065, 0.06, 0.035, 0.015, 0],
      k.group,
      16,
    ),
    'single-curling-ghost-tail',
  );
  ribbon(
    k,
    0x9c79ad,
    [
      [0.13, -0.4, 0.06],
      [-0.03, -0.48, 0.075],
      [-0.25, -0.48, 0.09],
    ],
    [0.025, 0.02, 0],
    [0.012, 0.01, 0],
    k.group,
    10,
  );
  for (const offset of [0, 0.055])
    ribbon(
      k,
      C.violet,
      [
        [0.14, -0.29, 0.14 + offset],
        [-0.08, -0.43, 0.15 + offset],
        [-0.35, -0.39, 0.1 + offset],
        [-0.5, -0.23, 0.08 + offset],
        [-0.47, -0.1, 0.06 + offset],
      ],
      [0.045, 0.065, 0.05, 0.025, 0],
      [0.012, 0.018, 0.014, 0.008, 0],
      body,
      16,
    );
  k.group.userData.design = {
    concept: 'creature-v2-school-concept.png',
    role: 'tank',
    details: [
      'bound-spine',
      'layered-pages',
      'corner-clasps',
      'focused-cover-eyes',
      'diamond-lock',
      'single-ghost-tail',
    ],
  };
  return k.group;
}
function pencilGhost(): THREE.Group {
  const k = new SculptKit();
  k.group.name = 'pencilGhost';
  const shaft = new THREE.Group();

  k.group.add(shaft);
  const shaftGeometry = new THREE.BufferGeometry();
  shaftGeometry.setAttribute('position', new THREE.Float32BufferAttribute(schoolPencilShaftData.position, 3));
  shaftGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(schoolPencilShaftData.normal, 3));
  shaftGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(schoolPencilShaftData.uv, 2));
  name(k.mesh(shaftGeometry, 0xe9b342, undefined, undefined, shaft), 'hexagonal-yellow-shaft');
  const seatInCut = (mesh: THREE.Mesh, clearance: number) => {
    mesh.updateMatrix();
    const inverse = mesh.matrix.clone().invert(),
      source = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone(),
      p = source.getAttribute('position'),
      out: number[] = [];
    for (let i = 0; i < p.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(p, i),
        b = new THREE.Vector3().fromBufferAttribute(p, i + 1),
        c = new THREE.Vector3().fromBufferAttribute(p, i + 2);
      if (b.clone().sub(a).cross(c.clone().sub(a)).normalize().z > -0.7) continue;
      for (const v of [a, b, c]) {
        v.applyMatrix4(mesh.matrix);
        v.z = -0.12 + Math.abs(v.x) / Math.sqrt(3) + clearance;
        v.applyMatrix4(inverse);
        out.push(...v.toArray());
      }
    }
    source.dispose();
    mesh.geometry.dispose();
    mesh.geometry = new THREE.BufferGeometry();
    mesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
    mesh.geometry.computeVertexNormals();
  };
  name(k.cylinder(0xc4a57b, [0, -0.465, 0], 0.12, 0.026, 0.28, shaft, 6), 'sharpened-wood');
  name(k.cylinder(0x252735, [0, -0.67, 0], 0.027, 0, 0.13, shaft, 6), 'graphite-point');
  k.cylinder(0x8e929b, [0, 0.43, 0], 0.125, 0.125, 0.12, shaft, 12);
  for (const y of [0.385, 0.42, 0.465])
    k.torus(0x555760, [0, y, 0], 0.124, 0.008, shaft, 'metal').rotation.x = Math.PI / 2;
  name(
    k.loft(
      0x725370,
      [
        [-0.075, 0.115, 0.115],
        [-0.045, 0.119, 0.119],
        [0.07, 0.102, 0.102],
        [0.09, 0, 0],
      ],
      [0, 0.55, 0],
      shaft,
      'cloth',
      8,
      12,
    ),
    'dark-eraser',
  );
  for (const side of [-1, 1]) {
    const socket = eye(k, side * 0.055, -0.074, -0.055, 0.105, 0.07, 0x3d2940, shaft, side);
    socket.name = 'recessed-ink-eye-socket';
    socket.rotation.z = side * 0.23;
    seatInCut(socket, 0.014);

    const iris = eye(k, side * 0.055, -0.074, -0.064, 0.057, 0.024, 0xffedbc, shaft, side);
    iris.rotation.z = side * 0.23;
    seatInCut(iris, 0.007);
  }
  ribbon(
    k,
    C.violet,
    [
      [0.1, 0.42, 0.1],
      [0.21, 0.29, 0.12],
      [0.24, 0.03, 0.14],
      [0.17, -0.23, 0.12],
    ],
    [0.014, 0.035, 0.026, 0],
    [0.008, 0.016, 0.012, 0],
    shaft,
    13,
  );
  for (const side of [-1, 1]) {
    const trail = ribbon(
      k,
      C.violet,
      [
        [side * 0.09, 0.3, 0.08],
        [side * 0.19, 0.18, 0.1],
        [side * 0.24, 0.02, 0.13],
        [side * 0.21, -0.12, 0.16],
        [side * 0.29, -0.21, 0.18],
      ],
      [0.006, 0.021, 0.018, 0.011, 0],
      [0.003, 0.004, 0.003, 0.002, 0],
      shaft,
      18,
    );
    name(trail, `split-spectral-pencil-trail-${side}`);
  }
  shaft.rotation.x = 1.05;
  shaft.rotation.z = -0.55;
  k.group.userData.design = {
    concept: 'creature-v2-school-concept.png',
    role: 'charger',
    details: ['hexagonal-shaft', 'wood-graphite-point', 'banded-ferrule', 'eraser', 'ink-brow-face'],
  };
  return k.group;
}
function paperGhost(): THREE.Group {
  const k = new SculptKit();
  k.group.name = 'paperGhost';
  // Folded paper geometry: thin triangular planes meet along a real central keel.
  const verts = [
    0, 0.04, -0.68, -0.57, 0.08, 0.29, -0.13, 0.26, 0.08, 0, 0.04, -0.68, -0.13, 0.26, 0.08, 0, 0.04, 0.36, 0, 0.04,
    -0.68, 0, 0.04, 0.36, 0.13, 0.26, 0.08, 0, 0.04, -0.68, 0.13, 0.26, 0.08, 0.57, 0.08, 0.29, 0, 0.04, -0.68, 0,
    -0.13, 0.22, -0.13, 0.26, 0.08, 0, 0.04, -0.68, 0.13, 0.26, 0.08, 0, -0.13, 0.22,
  ];
  // Authored secondary folds and small torn notches on the two outer wing panels.
  // All printing is subsequently projected onto these exact new triangles.
  for (const start of [27, 0]) {
    const a = new THREE.Vector3().fromArray(verts, start);
    const b = new THREE.Vector3().fromArray(verts, start + 3);
    const c = new THREE.Vector3().fromArray(verts, start + 6);
    const outer = Math.abs(b.x) > Math.abs(c.x) ? b : c;
    const inner = outer === b ? c : b;
    const edge1 = a.clone().lerp(outer, 0.83);
    edge1.y += 0.032;
    const edge2 = a.clone().lerp(outer, 0.88).lerp(inner, 0.055);
    edge2.y += 0.024;
    const edge3 = a.clone().lerp(outer, 0.93);
    edge3.y += 0.041;
    const curled = outer.clone();
    curled.y += 0.055;
    curled.z -= 0.018;
    const boundary = [a, edge1, edge2, edge3, curled, inner];
    if (outer === c) boundary.reverse();
    const center = a
      .clone()
      .add(outer)
      .add(inner)
      .multiplyScalar(1 / 3);
    center.y += 0.012;
    const panels: number[] = [];
    for (let j = 0; j < boundary.length; j++)
      panels.push(...center.toArray(), ...boundary[j].toArray(), ...boundary[(j + 1) % boundary.length].toArray());
    verts.splice(start, 9, ...panels);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.computeVertexNormals();
  const paperUV: number[] = [];
  for (let i = 0; i < verts.length; i += 3) paperUV.push((verts[i] + 0.57) / 1.14, (verts[i + 2] + 0.68) / 1.04);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(paperUV, 2));
  const mesh = k.mesh(g, 0xe4dfd5);
  (mesh.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  mesh.name = 'creased-paper-airframe';
  for (const s of [-1, 1]) {
    ribbon(
      k,
      0x9c9291,
      [
        [0, 0.045, -0.68],
        [s * 0.13, 0.264, 0.08],
        [s * 0.57, 0.084, 0.29],
      ],
      [0.004, 0.005, 0.003],
      [0.004, 0.004, 0.002],
      k.group,
      6,
    );
    const eyeOutline = [
      [s * 0.025, -0.46],
      [s * 0.125, -0.33],
      [s * 0.103, -0.3],
      [s * 0.04, -0.405],
    ];
    // Clip the ink polygon against each actual fold triangle. Four projected corners
    // alone create a chord through the keel and leave only tiny visible ink fragments.
    const eyeP: number[] = [];
    for (let face = 0; face < verts.length / 9 - 2; face++) {
      const tri = [0, 1, 2].map(
        (i) => new THREE.Vector3(verts[face * 9 + i * 3], verts[face * 9 + i * 3 + 1], verts[face * 9 + i * 3 + 2]),
      );
      const cross = (a: number[], b: number[], p: number[]) =>
        (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
      const edges = tri.map((v) => [v.x, v.z]),
        sign = Math.sign(cross(edges[0], edges[1], edges[2]));
      let polygon = eyeOutline.map((p) => [...p]);
      for (let edge = 0; edge < 3; edge++) {
        const a = edges[edge],
          b = edges[(edge + 1) % 3],
          clipped: number[][] = [];
        for (let i = 0; i < polygon.length; i++) {
          const prev = polygon[(i + polygon.length - 1) % polygon.length],
            cur = polygon[i],
            pd = sign * cross(a, b, prev),
            cd = sign * cross(a, b, cur);
          if (pd >= 0 !== cd >= 0) {
            const t = pd / (pd - cd);
            clipped.push([prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])]);
          }
          if (cd >= 0) clipped.push(cur);
        }
        polygon = clipped;
      }
      const [a, b, c] = tri,
        den = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
      const emit = ([x, z]: number[]) => {
        const wa = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / den,
          wb = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / den;
        eyeP.push(x, wa * a.y + wb * b.y + (1 - wa - wb) * c.y + 0.0015, z);
      };
      for (let i = 1; i + 1 < polygon.length; i++) {
        emit(polygon[0]);
        emit(polygon[i]);
        emit(polygon[i + 1]);
      }
    }
    const eyeG = new THREE.BufferGeometry();
    eyeG.setAttribute('position', new THREE.Float32BufferAttribute(eyeP, 3));
    eyeG.computeVertexNormals();
    const inkEye = k.mesh(eyeG, 0x3d284a);
    (inkEye.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    inkEye.name = 'fold-clipped-predatory-ink-eye';
    const ray = new THREE.Raycaster();
    mesh.updateMatrixWorld(true);
    // A readable geometric ink diagram, seated on each broad wing.
    const diagram: Vec3[] = [];
    for (let j = 0; j <= 16; j++) {
      const a = (j / 16) * Math.PI * 2,
        x = s * (0.28 + 0.055 * Math.cos(a)),
        z = 0.055 * Math.sin(a);
      ray.set(new THREE.Vector3(x, 1, z), new THREE.Vector3(0, -1, 0));
      const hit = ray.intersectObject(mesh, false)[0];
      diagram.push([x, (hit?.point.y ?? 0.1) + 0.002, z]);
    }
    ribbon(k, 0x8a7c8a, diagram, [0.002, 0.002], [0.0015, 0.0015], k.group, 16);
    const sigil: Vec3[] = [];
    for (let j = 0; j <= 3; j++) {
      const a = Math.PI / 2 + ((j % 3) * Math.PI * 2) / 3,
        x = s * (0.28 + 0.044 * Math.cos(a)),
        z = 0.044 * Math.sin(a);
      ray.set(new THREE.Vector3(x, 1, z), new THREE.Vector3(0, -1, 0));
      const hit = ray.intersectObject(mesh, false)[0];
      if (!hit) throw new Error('Paper sigil leaves actual wing');
      sigil.push([x, hit.point.y + 0.0015, z]);
    }
    ribbon(k, 0x65576d, sigil, [0.0018, 0.0018], [0.001, 0.001], k.group, 9);

    ribbon(
      k,
      C.violet,
      [
        [s * 0.51, 0.12, 0.25],
        [s * 0.57, 0.09, 0.42],
        [s * 0.49, 0.12, 0.61],
        [s * 0.62, 0.16, 0.79],
      ],
      [0.035, 0.025, 0.014, 0],
      [0.0035, 0.003, 0.002, 0],
      k.group,
      11,
    );
    ribbon(
      k,
      0x8a7c8a,
      [
        [s * 0.15, 0.1, -0.07],
        [s * 0.28, 0.105, 0.06],
        [s * 0.37, 0.1, 0.12],
      ],
      [0.002, 0.003, 0.002],
      [0.002, 0.002, 0.002],
      k.group,
      4,
    );
  }
  k.group.rotation.z = 0.13;
  k.group.rotation.x = -0.1;
  k.group.scale.x = 0.86;
  k.group.userData.design = {
    concept: 'creature-v2-school-concept.png',
    role: 'weaver',
    details: ['folded-paper-wings', 'central-keel', 'ink-ghost-face', 'curling-paper-corners'],
  };
  return k.group;
}
function ghostTeacher(): THREE.Group {
  const k = new SculptKit();
  k.group.name = 'ghostTeacher';
  // Board wings create an imposing academic silhouette without unrelated armor.
  const board = new THREE.Group();
  board.position.set(0, 1.99, 0.35);
  board.rotation.z = -0.045;
  k.group.add(board);
  name(block(k, 0x25403a, [0, 0, 0], [2.43, 1.03, 0.085], board), 'dark-green-blackboard');
  for (const y of [-0.53, 0.53]) block(k, C.gold, [0, y, -0.018], [2.52, 0.055, 0.1], board, 'metal');
  for (const x of [-1.24, 1.24]) block(k, C.gold, [x, 0, -0.018], [0.055, 1.11, 0.1], board, 'metal');
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      plate(
        k,
        C.gold,
        [
          [0, 0],
          [-sx * 0.15, 0],
          [-sx * 0.05, -sy * 0.055],
          [0, -sy * 0.17],
        ],
        0.03,
        [sx * 1.25, sy * 0.54, -0.075],
        board,
        'metal',
      );
      stud(k, C.lightGold, [sx * 1.21, sy * 0.5, -0.078], 0.022, board);
    }
  // Actual chalk diagrams, not unreadable microtext or a blank rectangle.
  for (const s of [-1, 1]) {
    const cx = s * 0.78;
    const ring = k.torus(0xb3bca7, [cx, 0.08, -0.055], 0.2, 0.006, board);
    ring.scale.y = 0.8;
    ribbon(
      k,
      0xb3bca7,
      [
        [cx - 0.27, 0.06, -0.06],
        [cx + 0.28, 0.06, -0.06],
      ],
      [0.005, 0.005],
      [0.004, 0.004],
      board,
      3,
    );
    ribbon(
      k,
      0xb3bca7,
      [
        [cx, -0.22, -0.06],
        [cx, 0.34, -0.06],
      ],
      [0.005, 0.005],
      [0.004, 0.004],
      board,
      3,
    );
    ribbon(
      k,
      0xb3bca7,
      [
        [cx - 0.2, -0.21, -0.06],
        [cx + 0.18, 0.31, -0.06],
        [cx + 0.23, -0.19, -0.06],
        [cx - 0.2, -0.21, -0.06],
      ],
      [0.005, 0.005, 0.005, 0.005],
      [0.004, 0.004, 0.004, 0.004],
      board,
      6,
    );
  }
  name(
    k.loft(
      C.cloth,
      [
        [0.78, 0, 0],
        [0.91, 0.23, 0.16],
        [1.18, 0.26, 0.18],
        [1.56, 0.27, 0.2],
        [1.93, 0.34, 0.21],
        [2.19, 0.36, 0.21],
        [2.32, 0.19, 0.15],
        [2.4, 0.1, 0.1],
        [2.44, 0, 0],
      ],
      undefined,
      undefined,
      'cloth',
      22,
      20,
    ),
    'tailored-continuous-torso',
  );
  const tailored = k.group.getObjectByName('tailored-continuous-torso') as THREE.Mesh;
  const tp = tailored.geometry.getAttribute('position');
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i),
      y = tp.getY(i),
      z = tp.getZ(i);
    const low = Math.max(0, Math.min(1, (1.65 - y) / 0.7));
    const angle = Math.atan2(x, z),
      fold =
        0.021 * Math.sin(angle * 7 + y * 2.8) * low +
        0.032 * Math.cos(angle * 6 + (y - 1.55) * 9) * Math.exp(-(((y - 1.75) / 0.28) ** 2));
    tp.setXYZ(i, x + Math.sin(angle) * fold, y, z + Math.cos(angle) * fold);
  }
  tailored.geometry.computeVertexNormals();
  // Layered spectral cloth, with asymmetric weighted curls instead of one inflated ice-cream tail.
  for (let layer = 0; layer < 3; layer++) {
    const paths: Vec3[][] = [
      [
        [0, 1.36, 0.1],
        [-0.12, 1.02, 0.04],
        [0.08, 0.69, -0.015],
        [-0.12, 0.43, -0.05],
        [-0.3, 0.23, 0.025],
        [-0.2, 0.18, 0.08],
      ],
      [
        [-0.13, 1.25, 0.14],
        [-0.23, 0.9, 0.14],
        [-0.38, 0.66, 0.1],
        [-0.42, 0.43, 0.04],
        [-0.6, 0.3, 0.03],
        [-0.63, 0.37, 0.05],
      ],
      [
        [0.13, 1.28, 0.18],
        [0.22, 0.98, 0.15],
        [0.19, 0.75, 0.1],
        [0.31, 0.54, 0.04],
        [0.45, 0.44, 0.03],
        [0.4, 0.29, 0.03],
      ],
    ];
    const tail = k.mesh(
      foldedClothGeometry(
        paths[layer],
        layer === 0 ? [0.18, 0.24, 0.2, 0.14, 0.07, 0] : [0.1, 0.13, 0.1, 0.06, 0.025, 0],
        layer === 0 ? 28 : 22,
        layer === 0 ? 0.95 : -0.75,
      ),
      layer === 1 ? 0xd4cec7 : C.ivory,
    );
    name(closeSweepEnds(tail, 10, true), `layered-spectral-cloth-${layer}`);
  }
  for (const side of [-1, 1]) {
    const points: Vec3[] = [
      [side * 0.13, 1.05, 0.16],
      [side * 0.28, 0.77, 0.14],
      [side * 0.44, 0.5, 0.1],
      [side * 0.56, 0.34, 0.07],
      [side * 0.65, 0.4, 0.07],
    ];
    const wisp = k.mesh(
      hairSweepGeometry(
        points,
        side < 0 ? [0.02, 0.065, 0.055, 0.028, 0] : [0.012, 0.025, 0.022, 0.012, 0],
        [0.004, 0.005, 0.004, 0.003, 0],
        14,
        6,
      ),
      side < 0 ? C.ivory : C.violet,
    );
    name(closeSweepEnds(wisp, 6), 'thin-spectral-hem-stream');
  }
  const teacherClothesStart = new Set(k.group.children);
  for (const s of [-1, 1]) {
    const flapPath: Vec3[] = [
      [s * 0.25, 2.05, -0.1],
      [s * 0.29, 1.62, -0.18],
      [s * 0.48, 1.15, s < 0 ? -0.1 : 0.13],
      [s * 0.79, s < 0 ? 0.83 : 1.14, s < 0 ? -0.03 : 0.24],
      [s * 0.92, s < 0 ? 0.96 : 1.33, s < 0 ? 0.06 : 0.26],
    ];
    const flap = k.mesh(
      foldedClothGeometry(flapPath, [0.15, 0.17, 0.22, 0.15, 0], 22, s < 0 ? 0.35 : -0.55, 0.007),
      C.cloth,
    );
    name(closeSweepEnds(flap, 10, true), 'flowing-coat-tail');
    const edgePoints: THREE.Vector3[] = [],
      fp = flap.geometry.getAttribute('position');
    for (let j = 0; j <= 22; j++) {
      const p = new THREE.Vector3().fromBufferAttribute(fp, j * 11 + (s > 0 ? 4 : 0));
      p.z -= 0.004;
      edgePoints.push(p);
    }
    const piping = k.mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edgePoints), 22, 0.006, 6, false),
      C.gold,
      [0, 0, 0],
      [1, 1, 1],
      undefined,
      'metal',
    );
    name(closeSweepEnds(piping, 6), 'surface-following-coat-piping');
    name(
      plate(
        k,
        C.leather,
        [
          [0, 0],
          [s * 0.17, 0.12],
          [s * 0.18, -0.12],
          [s * 0.07, -0.29],
        ],
        0.025,
        [s * 0.13, 2.15, -0.245],
      ),
      'raised-coat-lapel',
    );
    ribbon(
      k,
      C.gold,
      [
        [s * 0.13, 2.15, -0.207],
        [s * 0.3, 2.27, -0.15],
        [s * 0.28, 2.03, -0.147],
      ],
      [0.012, 0.012, 0.007],
      [0.007, 0.007, 0.005],
      k.group,
      9,
      'metal',
    );
  }
  plate(
    k,
    C.ivory,
    [
      [-0.095, 0.11],
      [0.095, 0.11],
      [0.07, -0.2],
      [0, -0.28],
      [-0.07, -0.2],
    ],
    0.018,
    [0, 2.13, -0.25],
  );
  plate(
    k,
    C.gold,
    [
      [0, 0.035],
      [0.032, 0],
      [0, -0.05],
      [-0.032, 0],
    ],
    0.022,
    [0, 2.22, -0.28],
    undefined,
    'metal',
  );
  for (const y of [1.84, 1.65, 1.48]) stud(k, C.gold, [0, y, -0.225], 0.023);
  const teacherTorso = k.group.getObjectByName('tailored-continuous-torso') as THREE.Mesh;
  for (const child of k.group.children)
    if (
      child instanceof THREE.Mesh &&
      !teacherClothesStart.has(child) &&
      child.geometry instanceof THREE.ExtrudeGeometry
    ) {
      const color = (child.material as THREE.MeshStandardMaterial).color.getHex();
      conformFront(child, teacherTorso, color === C.gold ? 0.032 : 0.014);
      if (color === C.ivory) {
        child.name = 'folded-academic-cravat';
        const p = child.geometry.getAttribute('position');
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i),
            y = p.getY(i);
          const fold = 0.005 * (1 + Math.cos(x * 112)) * Math.max(0, 1 - Math.abs(y + 0.06) / 0.23);
          p.setZ(i, p.getZ(i) - fold);
        }
        child.geometry.computeVertexNormals();
      }
    }
  for (const side of [-1, 1]) {
    const foldPoints = frontPoints(
      teacherTorso,
      [
        [side * 0.015, 2.28, -0.1],
        [side * 0.03, 2.21, -0.2],
        [side * 0.025, 2.09, -0.2],
        [side * 0.048, side < 0 ? 1.96 : 2.01, -0.2],
      ],
      0.022,
    );
    name(
      ribbon(k, C.ivory, foldPoints, [0.024, 0.037, 0.03, 0], [0.006, 0.012, 0.008, 0], k.group, 10),
      'rooted-folded-cravat-ridge',
    );
  }
  const knot = frontPoints(teacherTorso, [[0, 2.3, 0]], 0.027)[0];
  name(
    k.loft(
      C.ivory,
      [
        [-0.032, 0, 0],
        [-0.02, 0.047, 0.015],
        [0, 0.052, 0.021],
        [0.021, 0.042, 0.014],
        [0.03, 0, 0],
      ],
      knot,
      undefined,
      'cloth',
      6,
      12,
    ),
    'wrapped-cravat-knot',
  );
  const tieBridge = ribbon(
    k,
    C.ivory,
    frontPoints(
      teacherTorso,
      [
        [0, 2.42, 0],
        [0, 2.36, 0],
        [0, 2.3, 0],
      ],
      0.013,
    ),
    [0.028, 0.026, 0.035],
    [0.004, 0.006, 0.005],
    k.group,
    4,
  );
  name(closeSweepEnds(tieBridge), 'connected-neck-to-cravat-fabric');
  // A fitted belt and a single substantial diamond buckle articulate the waist.
  name(
    k.loft(
      C.leather,
      [
        [1.49, 0.275, 0.205],
        [1.55, 0.276, 0.206],
      ],
      undefined,
      undefined,
      'cloth',
      2,
      24,
    ),
    'tailored-waist-belt',
  );
  const buckleShape = new THREE.Shape();
  buckleShape.moveTo(0, 0.055);
  buckleShape.lineTo(0.065, 0);
  buckleShape.lineTo(0, -0.055);
  buckleShape.lineTo(-0.065, 0);
  buckleShape.closePath();
  const buckleHole = new THREE.Path();
  buckleHole.moveTo(0, 0.032);
  buckleHole.lineTo(-0.039, 0);
  buckleHole.lineTo(0, -0.032);
  buckleHole.lineTo(0.039, 0);
  buckleHole.closePath();
  buckleShape.holes.push(buckleHole);
  name(
    k.mesh(
      new THREE.ExtrudeGeometry(buckleShape, {
        depth: 0.012,
        bevelEnabled: true,
        bevelSize: 0.003,
        bevelThickness: 0.002,
        bevelSegments: 1,
        steps: 1,
      }),
      C.gold,
      [0, 1.52, -0.224],
      [1, 1, 1],
      undefined,
      'metal',
    ),
    'open-framed-waist-buckle',
  );
  // Continuous bent sleeves, their proximal ends embedded into the tailored shoulder volume.
  name(
    ribbon(
      k,
      C.cloth,
      [
        [-0.255, 2.14, 0],
        [-0.52, 2.04, -0.06],
        [-0.72, 1.88, -0.1],
        [-0.95, 1.94, -0.22],
      ],
      [0.15, 0.13, 0.095, 0.065],
      [0.14, 0.12, 0.085, 0.06],
      k.group,
      18,
    ),
    'chalk-arm-sleeve',
  );
  name(
    ribbon(
      k,
      C.cloth,
      [
        [0.255, 2.14, 0],
        [0.51, 2.13, -0.06],
        [0.7, 2.24, -0.11],
        [0.87, 2.42, -0.19],
      ],
      [0.15, 0.13, 0.09, 0.065],
      [0.14, 0.12, 0.08, 0.06],
      k.group,
      18,
    ),
    'commanding-arm-sleeve',
  );
  for (const sleeve of ['chalk-arm-sleeve', 'commanding-arm-sleeve']) {
    const mesh = k.group.getObjectByName(sleeve) as THREE.Mesh;
    const p = mesh.geometry.getAttribute('position');
    // Directional elbow compression folds in the existing sleeve surface, not stacked rings.
    for (let row = 0; row <= 18; row++) {
      const t = row / 18,
        center = new THREE.Vector3();
      for (let j = 0; j < 12; j++) center.add(new THREE.Vector3().fromBufferAttribute(p, row * 13 + j));
      center.multiplyScalar(1 / 12);
      for (let j = 0; j <= 12; j++) {
        const i = row * 13 + j,
          v = new THREE.Vector3().fromBufferAttribute(p, i).sub(center);
        const a = (j / 12) * Math.PI * 2;
        const innerWeight = 0.25 + 0.75 * Math.max(0, Math.cos(a));
        const amplitude =
          -0.22 *
          innerWeight *
          Math.exp(-(((t - 0.57) / 0.22) ** 2)) *
          Math.pow(Math.max(0, Math.sin(t * 23 + Math.cos(a) * 1.5)), 3);
        v.multiplyScalar(1 + amplitude).add(center);
        p.setXYZ(i, v.x, v.y, v.z);
      }
    }
    mesh.geometry.computeVertexNormals();
    closeSweepEnds(mesh);
  }
  const lh = hand(k, [-0.99, 2.005, -0.225], 'chalk');
  lh.rotation.z = 0.57;
  const rh = hand(k, [0.92, 2.49, -0.205], 'spell');
  rh.rotation.z = -0.5;
  for (const h of [lh, rh]) {
    name(
      k.loft(
        C.ivory,
        [
          [-0.025, 0.062, 0.052],
          [0.025, 0.067, 0.053],
          [0.032, 0.055, 0.045],
        ],
        [0, -0.075, 0],
        h,
        'cloth',
        5,
        12,
      ),
      'fitted-wrist-cuff',
    );
    name(
      k.loft(
        C.gold,
        [
          [-0.01, 0.064, 0.051],
          [-0.008, 0.069, 0.056],
          [0.008, 0.069, 0.056],
          [0.01, 0.064, 0.051],
        ],
        [0, -0.082, 0],
        h,
        'metal',
        3,
        12,
      ),
      'seated-gold-cuff-band',
    );
  }
  name(k.cylinder(0xe3e0d4, [0, 0.07, -0.065], 0.025, 0.027, 0.4, lh, 10), 'chalk-in-closed-finger-grip');
  for (const side of [-1, 1]) {
    ribbon(
      k,
      C.leather,
      [
        [side * 0.17, 2.27, -0.12],
        [side * 0.11, 2.39, -0.085],
        [side * 0.065, 2.47, -0.05],
      ],
      [0.068, 0.055, 0.025],
      [0.035, 0.03, 0.016],
      k.group,
      10,
    );
  }
  name(
    k.loft(
      C.ivory,
      [
        [2.31, 0.086, 0.08],
        [2.39, 0.081, 0.077],
        [2.48, 0.073, 0.068],
        [2.515, 0, 0],
      ],
      [0, 0, -0.015],
      undefined,
      'cloth',
      8,
      16,
    ),
    'tailored-standing-ivory-collar',
  );
  for (const part of buildSchoolAuthoredFace('teacher')) k.group.add(part);
  // Spectacles fitted directly around the small stern eyes, with temples attaching to head sides.
  for (const s of [-1, 1]) {
    const ring = k.torus(0x7e745c, [s * 0.07, 2.746, -0.18], 0.051, 0.008, undefined, 'metal');
    ring.scale.y = 0.67;
    ring.rotation.y = -s * 0.2;
    block(k, 0x7e745c, [s * 0.024, 2.75, -0.183], [0.009, 0.013, 0.008], k.group, 'metal', 0.002);
    ribbon(
      k,
      0x7e745c,
      [
        [s * 0.115, 2.75, -0.18],
        [s * 0.15, 2.77, -0.12],
        [s * 0.14, 2.76, -0.025],
      ],
      [0.007, 0.007, 0.006],
      [0.006, 0.006, 0.005],
      k.group,
      7,
      'metal',
    );
  }
  ribbon(
    k,
    0x7e745c,
    [
      [-0.018, 2.75, -0.19],
      [0, 2.765, -0.2],
      [0.018, 2.75, -0.19],
    ],
    [0.006, 0.006, 0.006],
    [0.005, 0.005, 0.005],
    k.group,
    5,
    'metal',
  );
  // A connected swept-back cap with asymmetrical broad locks, never upward antlers.
  name(
    k.loft(
      0xd6d3cf,
      [
        [-0.1, 0, 0],
        [-0.07, 0.14, 0.115],
        [0.01, 0.15, 0.12],
        [0.075, 0.1, 0.08],
        [0.1, 0, 0],
      ],
      [0, 2.915, 0.015],
      undefined,
      'cloth',
      12,
      16,
    ),
    'connected-hair-cap',
  );
  const locks: Vec3[][] = [
    [
      [0.055, 2.94, 0.005],
      [-0.025, 2.965, -0.035],
      [-0.16, 2.975, -0.015],
      [-0.26, 3.025, 0.025],
      [-0.25, 3.07, 0.045],
    ],
    [
      [0.025, 2.94, 0.02],
      [-0.065, 3.005, 0.02],
      [-0.2, 3.015, 0.04],
      [-0.31, 3.065, 0.075],
      [-0.34, 3.11, 0.085],
    ],
    [
      [0.005, 2.945, 0.035],
      [-0.1, 3.045, 0.075],
      [-0.22, 3.07, 0.105],
      [-0.29, 3.13, 0.13],
      [-0.27, 3.17, 0.14],
    ],
    [
      [0.01, 2.94, 0.055],
      [-0.085, 2.995, 0.13],
      [-0.21, 3.0, 0.16],
      [-0.325, 3.03, 0.18],
      [-0.37, 3.075, 0.16],
    ],
  ];
  for (let i = 0; i < locks.length; i++) {
    const lock = k.mesh(
      hairSweepGeometry(locks[i], [0.012, 0.045, 0.034, 0.018, 0.001], [0.012, 0.035, 0.026, 0.013, 0.001], 16, 8),
      0xc7c6c5,
    );
    name(closeSweepEnds(lock, 8), `swept-sculpted-hair-${i}`);
  }
  k.group.userData.design = {
    concept: 'creature-v2-school-concept.png',
    role: 'boss',
    details: [
      'chalk-grip',
      'individual-fingers',
      'fitted-spectacles',
      'stern-elongated-face',
      'tailored-lapels',
      'metal-closures',
      'actual-chalk-diagrams',
      'framed-blackboard',
      'spectral-tail',
    ],
  };
  return k.group;
}
/** Hair ribbons keep their broad cross-section in the silhouette plane; generic Frenet frames
 * rotate near-vertical ribbons edge-on and reduce a hair curtain to thin hoops. */
function foldedClothGeometry(points: Vec3[], widths: number[], steps: number, twist: number, thickness = 0.004) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
    false,
    'centripetal',
  );
  const p: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  const sides = 10;
  for (let j = 0; j <= steps; j++) {
    const t = j / steps,
      c = curve.getPointAt(t),
      tangent = curve.getTangentAt(t).normalize();
    const wAxis = new THREE.Vector3(tangent.y, -tangent.x, 0)
      .normalize()
      .applyAxisAngle(tangent, twist * Math.sin(t * Math.PI) + t * 0.25);
    const dAxis = tangent.clone().cross(wAxis).normalize();
    const q = t * (widths.length - 1),
      k = Math.min(widths.length - 2, Math.floor(q)),
      blend = (q - k) * (q - k) * (3 - 2 * (q - k)),
      w = Math.max(0.0005, widths[k] + (widths[k + 1] - widths[k]) * blend);
    for (let i = 0; i <= sides; i++) {
      const index = i % sides,
        front = index < 5,
        u = front ? -1 + index * 0.5 : 1 - (index - 5) * 0.5;
      const fold = 0.025 * Math.cos(u * Math.PI * 2 + t * 3) * Math.sin(t * Math.PI);
      const point = c
        .clone()
        .addScaledVector(wAxis, u * w)
        .addScaledVector(dAxis, fold + (front ? thickness : -thickness));
      p.push(...point.toArray());
      uv.push((u + 1) / 2, t);
      if (j < steps && i < sides) {
        const a = j * (sides + 1) + i,
          b = a + sides + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
function hairSweepGeometry(points: Vec3[], widths: number[], depths: number[], steps: number, sides: number) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
    false,
    'centripetal',
  );
  const positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  const interp = (a: number[], t: number) => {
    const p = t * (a.length - 1),
      i = Math.min(a.length - 2, Math.floor(p)),
      f = p - i;
    return a[i] + (a[i + 1] - a[i]) * f;
  };
  for (let j = 0; j <= steps; j++) {
    const t = j / steps,
      c = curve.getPointAt(t),
      tangent = curve.getTangentAt(t).normalize();
    const widthAxis = new THREE.Vector3(tangent.y, -tangent.x, 0).normalize();
    const depthAxis = tangent.clone().cross(widthAxis).normalize();
    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const p = c
        .clone()
        .addScaledVector(widthAxis, Math.cos(angle) * interp(widths, t))
        .addScaledVector(depthAxis, Math.sin(angle) * interp(depths, t));
      positions.push(...p.toArray());
      uv.push(i / sides, t);
      if (j < steps && i < sides) {
        const a = j * (sides + 1) + i,
          b = a + sides + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
/** Scalp shell ends at an authored hairline, never a full ellipsoid cutting through the face. */
function girlScalpGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(schoolGirlCrown.position, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(schoolGirlCrown.normal, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(schoolGirlCrown.uv, 2));
  return geometry;
}
function ghostGirl(): THREE.Group {
  const k = new SculptKit();
  k.group.name = 'ghostGirl';
  const hair = 0x242034,
    uniform = 0x242934,
    trim = 0x8c7753;
  name(k.mesh(girlScalpGeometry(), hair), 'continuous-hair-crown');
  // A pair of wall-like curtains is the signature, not a round hair helmet.
  for (const side of [-1, 1]) {
    const paths: Vec3[][] = [
      [
        [side * 0.035, 2.84, 0.055],
        [side * 0.49, 2.57, 0.13],
        [side * 0.91, 2.35, 0.17],
        [side * 1.17, 2.08, 0.18],
        [side * 1.08, 1.29, 0.16],
        [side * 0.73, 0.82, 0.02],
        [side * 0.95, 0.6, -0.035],
        [side * 1.23, 0.77, -0.02],
      ],
      [
        [side * 0.04, 2.83, 0.055],
        [side * 0.57, 2.46, 0.23],
        [side * 0.83, 2.14, 0.25],
        [side * 0.73, 1.53, 0.23],
        [side * 0.98, 1.11, 0.14],
        [side * 1.22, 1.22, 0.05],
      ],
      [
        [side * 0.03, 2.85, 0.05],
        [side * 0.37, 2.5, 0.24],
        [side * 0.47, 1.92, 0.3],
        [side * 0.6, 1.18, 0.27],
        [side * 0.48, 0.56, 0.12],
        [side * 0.72, 0.36, 0.04],
      ],
    ];
    paths.forEach((rawPoints, index) => {
      const points: Vec3[] = rawPoints.map(([x, y, z], i) => [
        x,
        y + (side > 0 ? -0.13 : 0.045) * Math.sin((i * Math.PI) / (rawPoints.length - 1)),
        z +
          ((side > 0 ? 0.08 : -0.025) + (index === 1 ? 0.12 : index === 2 ? -0.12 : 0)) *
            Math.sin((i * Math.PI) / (rawPoints.length - 1)),
      ]);
      const widths =
        index === 0
          ? [0.025, 0.16, 0.19, 0.2, 0.17, 0.12, 0.07, 0]
          : index === 1
            ? [0.025, 0.12, 0.14, 0.15, 0.1, 0]
            : [0.025, 0.12, 0.13, 0.14, 0.1, 0];
      const depths = widths.map((w) => w * 0.3);
      const lock = k.mesh(hairSweepGeometry(points, widths, depths, 30, 8), hair);
      name(closeSweepEnds(lock, 8), `continuous-hair-wall-${side}-${index}`);
    });
  }
  for (const side of [-1, 1]) {
    const flowing: Vec3[] = [
      [side * 0.035, 2.82, 0.04],
      [side * 0.42, 2.6, 0.18],
      [side * 0.55, 2.05, 0.14],
      [side * 0.98, 1.8, 0.05],
      [side * 1.18, 1.45, -0.08],
      [side * 1.05, 1.25, -0.16],
      [side * 0.82, 1.35, -0.18],
    ];
    const lock = k.mesh(
      hairSweepGeometry(
        flowing,
        [0.015, 0.08, 0.1, 0.09, 0.08, 0.06, 0],
        [0.02, 0.035, 0.045, 0.04, 0.035, 0.025, 0],
        44,
        8,
      ),
      hair,
    );
    name(closeSweepEnds(lock, 8), `sweeping-hair-layer-${side}`);
  }
  name(
    k.loft(
      uniform,
      [
        [1.28, 0, 0],
        [1.36, 0.19, 0.13],
        [1.65, 0.21, 0.14],
        [1.97, 0.31, 0.17],
        [2.18, 0.28, 0.16],
        [2.29, 0.12, 0.1],
        [2.34, 0, 0],
      ],
      undefined,
      undefined,
      'cloth',
      18,
      18,
    ),
    'fitted-school-jacket',
  );
  const skirtP: number[] = [],
    skirtUV: number[] = [],
    skirtI: number[] = [];
  const skirtRows = 8,
    skirtSides = 48;
  for (let row = 0; row <= skirtRows; row++) {
    const t = row / skirtRows,
      y = 1.45 - t * 0.55,
      base = 0.2 + t * 0.19;
    for (let j = 0; j <= skirtSides; j++) {
      const a = (j / skirtSides) * Math.PI * 2;
      const pleat = Math.cos(a * 12) * (0.008 + t * 0.022);
      skirtP.push(Math.sin(a) * (base + pleat), y + 0.025 * Math.sin(a * 3) * t, Math.cos(a) * (base * 0.67 + pleat));
      skirtUV.push(j / skirtSides, t);
      if (row < skirtRows && j < skirtSides) {
        const n = row * (skirtSides + 1) + j;
        skirtI.push(n, n + skirtSides + 1, n + 1, n + 1, n + skirtSides + 1, n + skirtSides + 2);
      }
    }
  }
  const skirtG = new THREE.BufferGeometry();
  skirtG.setAttribute('position', new THREE.Float32BufferAttribute(skirtP, 3));
  skirtG.setAttribute('uv', new THREE.Float32BufferAttribute(skirtUV, 2));
  skirtG.setIndex(skirtI);
  skirtG.computeVertexNormals();
  name(k.mesh(skirtG, uniform), 'continuous-pleated-uniform-skirt');
  const hemPoints: Vec3[] = [];
  for (let j = 0; j <= 48; j++) {
    const a = (j / 48) * Math.PI * 2,
      r = 0.39 + 0.03 * Math.cos(a * 12);
    hemPoints.push([
      Math.sin(a) * r,
      0.91 + 0.025 * Math.sin(a * 3),
      Math.cos(a) * (0.39 * 0.67 + 0.03 * Math.cos(a * 12)),
    ]);
  }
  ribbon(k, trim, hemPoints, [0.006, 0.006], [0.005, 0.005], k.group, 48);
  const girlClothesStart = new Set(k.group.children);
  plate(
    k,
    0xd4cec7,
    [
      [-0.18, 0.12],
      [0, -0.12],
      [0.18, 0.12],
      [0.12, 0.23],
      [-0.12, 0.23],
    ],
    0.02,
    [0, 2.03, -0.18],
  );
  for (const side of [-1, 1]) {
    plate(
      k,
      uniform,
      [
        [0, 0.16],
        [side * 0.18, 0.07],
        [side * 0.1, -0.19],
        [-side * 0.03, -0.07],
      ],
      0.02,
      [side * 0.07, 2.1, -0.21],
    );
    ribbon(
      k,
      trim,
      frontPoints(
        k.group.getObjectByName('fitted-school-jacket') as THREE.Mesh,
        [
          [side * 0.08, 2.27, -0.13],
          [side * 0.26, 2.17, -0.13],
          [side * 0.17, 1.91, -0.13],
        ],
        0.035,
      ),
      [0.007, 0.009, 0.004],
      [0.005, 0.005, 0.003],
      k.group,
      8,
    );
    plate(
      k,
      0x59447a,
      [
        [0, 0],
        [side * 0.14, 0.05],
        [side * 0.11, -0.07],
      ],
      0.018,
      [side * 0.015, 1.97, -0.22],
    );
  }
  stud(k, 0xb99b57, [0, 1.96, -0.222], 0.029);
  for (const y of [1.72, 1.54]) stud(k, trim, [0, y, -0.15], 0.016);
  const girlTorso = k.group.getObjectByName('fitted-school-jacket') as THREE.Mesh;
  for (const child of k.group.children)
    if (child instanceof THREE.Mesh && !girlClothesStart.has(child) && child.geometry instanceof THREE.ExtrudeGeometry)
      conformFront(
        child,
        girlTorso,
        (child.material as THREE.MeshStandardMaterial).color.getHex() === 0xd4cec7
          ? 0.012
          : (child.material as THREE.MeshStandardMaterial).color.getHex() === uniform
            ? 0.026
            : 0.04,
        true,
      );
  // Slim legs join inside the skirt. Socks, leather shoe quarters and sole are separate layers.
  for (const side of [-1, 1]) {
    const beforeLeg = new Set(k.group.children);
    const x = side * 0.14,
      offset = side < 0 ? 0.04 : 0;
    k.loft(
      C.face,
      [
        [0.35 + offset, 0, 0],
        [0.41 + offset, 0.055, 0.055],
        [0.78, 0.065, 0.065],
        [1.03, 0.075, 0.072],
        [1.13, 0, 0],
      ],
      [x, 0, 0.015],
      undefined,
      'cloth',
      13,
      12,
    );
    k.loft(
      0x30303a,
      [
        [0.22 + offset, 0.055, 0.052],
        [0.33 + offset, 0.061, 0.057],
        [0.6 + offset, 0.063, 0.06],
        [0.62 + offset, 0.059, 0.057],
      ],
      [x, 0, 0.015],
      undefined,
      'cloth',
      9,
      12,
    );
    name(
      ribbon(
        k,
        0x1e2029,
        [
          [x, 0.29 + offset, 0.03],
          [x, 0.18 + offset, -0.015],
          [x, 0.15 + offset, -0.13],
          [x, 0.16 + offset, -0.19],
        ],
        [0.055, 0.065, 0.07, 0],
        [0.06, 0.075, 0.08, 0],
        k.group,
        12,
      ),
      'school-shoe',
    );
    block(k, 0x393239, [x, 0.115 + offset, -0.065], [0.14, 0.028, 0.24], undefined, 'cloth', 0.008);
    block(k, trim, [x, 0.235 + offset, -0.09], [0.12, 0.012, 0.025], undefined, 'metal', 0.003);
    if (side < 0)
      for (const child of k.group.children) {
        if (!(child instanceof THREE.Mesh) || beforeLeg.has(child)) continue;
        child.updateMatrixWorld(true);
        const inverse = child.matrixWorld.clone().invert(),
          p = child.geometry.getAttribute('position');
        for (let i = 0; i < p.count; i++) {
          const v = new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(child.matrixWorld);
          const t = THREE.MathUtils.clamp((1.13 - v.y) / 1.02, 0, 1);
          v.x += 0.14 * t;
          v.z += -0.13 * Math.sin(Math.PI * t) + 0.08 * t;
          v.y += 0.1 * t;
          v.applyMatrix4(inverse);
          p.setXYZ(i, ...v.toArray());
        }
        child.geometry.computeVertexNormals();
      }
  }
  const leftPath: Vec3[] = [
    [-0.23, 2.14, 0.01],
    [-0.4, 2.18, -0.05],
    [-0.44, 2.27, -0.22],
    [-0.53, 2.34, -0.45],
  ];
  const rightPath: Vec3[] = [
    [0.23, 2.14, 0.01],
    [0.36, 1.98, -0.015],
    [0.44, 1.78, -0.1],
    [0.44, 1.64, -0.18],
  ];
  name(
    ribbon(k, uniform, leftPath, [0.125, 0.105, 0.08, 0.06], [0.11, 0.095, 0.073, 0.055], k.group, 16),
    'raised-curse-sleeve',
  );
  name(
    ribbon(k, uniform, rightPath, [0.125, 0.105, 0.08, 0.06], [0.11, 0.095, 0.073, 0.055], k.group, 16),
    'lowered-school-sleeve',
  );
  for (const sleeve of ['raised-curse-sleeve', 'lowered-school-sleeve'])
    closeSweepEnds(k.group.getObjectByName(sleeve) as THREE.Mesh);
  const left = hand(k, [-0.58, 2.38, -0.5], 'spell');
  left.scale.setScalar(0.75);
  left.rotation.z = 0.65;
  left.rotation.x = -0.65;
  const right = hand(k, [0.448, 1.6, -0.18], 'spell');
  right.scale.setScalar(0.66);
  right.rotation.z = Math.PI - 0.15;
  for (const part of buildSchoolAuthoredFace('girl')) k.group.add(part);
  // Parted fringe hides only part of one eye; sides originate above the skull, not floating sheets.
  name(
    ribbon(
      k,
      hair,
      [
        [-0.025, 2.89, 0.015],
        [-0.06, 2.75, -0.15],
        [-0.12, 2.65, -0.15],
        [-0.18, 2.45, -0.07],
      ],
      [0.025, 0.055, 0.035, 0],
      [0.015, 0.05, 0.025, 0],
      k.group,
      16,
    ),
    'parted-left-fringe',
  );
  name(
    ribbon(
      k,
      hair,
      [
        [0.025, 2.88, 0.015],
        [0.14, 2.79, -0.1],
        [0.19, 2.53, -0.1],
        [0.27, 2.31, 0.0],
      ],
      [0.025, 0.06, 0.04, 0],
      [0.015, 0.05, 0.025, 0],
      k.group,
      16,
    ),
    'parted-right-fringe',
  );
  for (const id of ['parted-left-fringe', 'parted-right-fringe'])
    closeSweepEnds(k.group.getObjectByName(id) as THREE.Mesh);
  for (const child of k.group.children) {
    if (child instanceof THREE.Mesh && (child.material as THREE.MeshStandardMaterial).color.getHex() === hair)
      child.position.y -= 0.06;
  }
  k.group.userData.design = {
    concept: 'creature-v2-school-concept.png',
    role: 'boss',
    details: [
      'two-hair-wall-masses',
      'parted-fringe',
      'focused-violet-eyes',
      'modest-school-uniform',
      'collar-ribbon-brooch',
      'layered-skirt-pleats',
      'individual-curse-fingers',
      'socks-shoes',
    ],
  };
  return k.group;
}
export function buildSchoolMonster(id: string, _color: number): THREE.Group | undefined {
  const model =
    id === 'bookGhost'
      ? bookGhost()
      : id === 'pencilGhost'
        ? pencilGhost()
        : id === 'paperGhost'
          ? paperGhost()
          : undefined;
  if (model) dressSchoolCreature(model, id);
  return model;
}
export function buildSchoolBoss(id: string): THREE.Group | undefined {
  const model = id === 'ghostTeacher' ? ghostTeacher() : id === 'ghostGirl' ? ghostGirl() : undefined;
  if (model) dressSchoolCreature(model, id);
  return model;
}
