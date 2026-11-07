import * as THREE from 'three';
import { SculptKit, loftGeometry, sweepGeometry, type Ring } from '../../SculptKit';
import type { Vec3, Surface } from '../../ModelKit';

export class CastleKit extends SculptKit {
  readonly patchMaterials = new Map<string, THREE.MeshStandardMaterial>();
  form(c: number, rings: readonly Ring[], name: string, sides = 16, rows = 18): THREE.Mesh {
    const m = this.mesh(loftGeometry(rings, rows, sides), c);
    m.name = name;
    return m;
  }
  path(
    c: number,
    points: readonly Vec3[],
    widths: readonly number[],
    depths = widths,
    name = 'authored-curve',
    steps = 12,
    sides = 8,
    surface: Surface = 'cloth',
  ): THREE.Mesh {
    const geometry = sweepGeometry(points, widths, depths, steps, sides);
    const positions = Array.from(geometry.getAttribute('position').array as ArrayLike<number>);
    const uv = Array.from(geometry.getAttribute('uv').array as ArrayLike<number>);
    const indices = Array.from(geometry.index!.array as ArrayLike<number>);
    for (const end of [0, steps]) {
      const center = new THREE.Vector3();
      for (let i = 0; i < sides; i++)
        center.add(
          new THREE.Vector3(
            ...(positions.slice((end * (sides + 1) + i) * 3, (end * (sides + 1) + i) * 3 + 3) as [
              number,
              number,
              number,
            ]),
          ),
        );
      center.multiplyScalar(1 / sides);
      const ci = positions.length / 3;
      positions.push(...center.toArray());
      uv.push(0.5, 0.5);
      const rim: number[] = [];
      for (let i = 0; i <= sides; i++) {
        const old = end * (sides + 1) + i;
        rim.push(positions.length / 3);
        positions.push(...positions.slice(old * 3, old * 3 + 3));
        uv.push(0.5 + 0.5 * Math.cos((i / sides) * Math.PI * 2), 0.5 + 0.5 * Math.sin((i / sides) * Math.PI * 2));
      }
      for (let i = 0; i < sides; i++) {
        if (end === 0) indices.push(ci, rim[i + 1], rim[i]);
        else indices.push(ci, rim[i], rim[i + 1]);
      }
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.deleteAttribute('normal');
    geometry.computeVertexNormals();
    const m = this.mesh(geometry, c, [0, 0, 0], [1, 1, 1], this.group, surface);
    m.name = name;
    return m;
  }
}
/** A closed curved triangular leaf, used for layered fur and tailored lapels. */
export function leaf(
  k: CastleKit,
  c: number,
  a: Vec3,
  b: Vec3,
  tip: Vec3,
  bulge = 0.025,
  name = 'sculpted-layer',
  rows = 5,
  cols = 4,
): THREE.Mesh {
  const A = new THREE.Vector3(...a),
    B = new THREE.Vector3(...b),
    T = new THREE.Vector3(...tip);
  const n = new THREE.Vector3().subVectors(B, A).cross(new THREE.Vector3().subVectors(T, A)).normalize();
  const p: number[] = [],
    uv: number[] = [],
    ix: number[] = [];
  for (let back = 0; back < 2; back++)
    for (let j = 0; j <= rows; j++)
      for (let i = 0; i <= cols; i++) {
        const v = j / rows,
          u = i / cols;
        const pt = A.clone().lerp(B, u).lerp(T, v);
        pt.addScaledVector(n, (back ? -1 : 1) * (bulge * Math.sin(Math.PI * u) * Math.sin(Math.PI * v) + 0.002));
        p.push(...pt.toArray());
        uv.push(u, v);
      }
  const layer = (rows + 1) * (cols + 1);
  for (let back = 0; back < 2; back++)
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const a = back * layer + j * (cols + 1) + i,
          b = a + cols + 1;
        if (back) ix.push(a, b, a + 1, a + 1, b, b + 1);
        else ix.push(a, a + 1, b, a + 1, b + 1, b);
      }
  const perimeter = [
    ...Array.from({ length: cols + 1 }, (_, i) => i),
    ...Array.from({ length: rows }, (_, j) => (j + 1) * (cols + 1) + cols),
    ...Array.from({ length: cols }, (_, i) => rows * (cols + 1) + cols - 1 - i),
    ...Array.from({ length: rows - 1 }, (_, j) => (rows - 1 - j) * (cols + 1)),
  ];
  for (let i = 0; i < perimeter.length; i++) {
    const a = perimeter[i],
      b = perimeter[(i + 1) % perimeter.length];
    const base = p.length / 3;
    for (const id of [a, b, a + layer, b + layer]) p.push(...p.slice(id * 3, id * 3 + 3));
    uv.push(0, 0, 1, 0, 0, 1, 1, 1);
    ix.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(ix);
  g.computeVertexNormals();
  const m = k.mesh(g, c);
  m.name = name;
  return m;
}
/** Sampled patch placed against one selected body, never against ornaments or eyes. */
export function patch(
  k: CastleKit,
  target: THREE.Mesh,
  color: number,
  xy: readonly (readonly [number, number])[],
  offset = 0.006,
  name = 'surface-detail',
  surface: Surface = 'cloth',
): THREE.Mesh {
  target.updateWorldMatrix(true, false);
  const ray = new THREE.Raycaster();
  const p: number[] = [],
    ix: number[] = [];
  const center: [number, number] = [
    xy.reduce((s, p) => s + p[0], 0) / xy.length,
    xy.reduce((s, p) => s + p[1], 0) / xy.length,
  ];
  const sample = (x: number, y: number) => {
    ray.set(new THREE.Vector3(x, y, -5), new THREE.Vector3(0, 0, 1));
    const h = ray.intersectObject(target, false)[0];
    if (!h) throw new Error(`${name}: projection miss ${x},${y}`);
    p.push(x, y, h.point.z - offset);
    return p.length / 3 - 1;
  };
  for (let edge = 0; edge < xy.length; edge++) {
    const A = center,
      B = xy[edge],
      C = xy[(edge + 1) % xy.length],
      ids: number[][] = [];
    const n = name.includes('harness') ? 8 : /ruby-eye|vampire-pupil/.test(name) ? 2 : 3;
    for (let j = 0; j <= n; j++) {
      ids[j] = [];
      for (let i = 0; i <= n - j; i++) {
        const u = i / n,
          v = j / n;
        ids[j][i] = sample(A[0] * (1 - u - v) + B[0] * u + C[0] * v, A[1] * (1 - u - v) + B[1] * u + C[1] * v);
      }
    }
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n - j; i++) {
        ix.push(ids[j][i], ids[j + 1][i], ids[j][i + 1]);
        if (i < n - j - 1) ix.push(ids[j][i + 1], ids[j + 1][i], ids[j + 1][i + 1]);
      }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  const minX = Math.min(...xy.map((p) => p[0])),
    maxX = Math.max(...xy.map((p) => p[0])),
    minY = Math.min(...xy.map((p) => p[1])),
    maxY = Math.max(...xy.map((p) => p[1]));
  const uv: number[] = [];
  for (let i = 0; i < p.length; i += 3)
    uv.push((p[i] - minX) / (maxX - minX || 1), (p[i + 1] - minY) / (maxY - minY || 1));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(ix);
  g.computeVertexNormals();
  const m = k.mesh(g, color, [0, 0, 0], [1, 1, 1], k.group, surface);
  const key = `${color}:${surface}`;
  let material = k.patchMaterials.get(key);
  if (!material) {
    material = (m.material as THREE.MeshStandardMaterial).clone();
    material.side = THREE.DoubleSide;
    k.patchMaterials.set(key, material);
  }
  m.material = material;
  m.name = name;
  return m;
}
export function tubeHand(k: CastleKit, origin: Vec3, skin: number, raised = false): void {
  const [x, y, z] = origin,
    s = x < 0 ? -1 : 1;
  if (raised) {
    k.path(
      skin,
      [
        [x - 0.055, y - 0.045, z],
        [x, y, z],
        [x + 0.055, y + 0.025, z],
      ],
      [0.06, 0.07, 0.045],
      [0.045, 0.045, 0.03],
      'upturned-connected-palm',
      10,
      10,
    );
    for (let i = 0; i < 4; i++) {
      const zz = z + (i - 1.5) * 0.034;
      const reach = [0.11, 0.155, 0.145, 0.105][i];
      k.path(
        skin,
        [
          [x + 0.025, y + 0.005, zz],
          [x + 0.09 + (i - 1.5) * 0.005, y + reach * 0.5, zz],
          [x + 0.065 + (i - 1.5) * 0.004, y + reach, zz - 0.01],
        ],
        [0.018, 0.017, 0.009, 0],
        [0.016, 0.014, 0.008, 0],
        'cupped-magic-finger',
        10,
        7,
      );
    }
    k.path(
      skin,
      [
        [x - 0.03, y, z - 0.045],
        [x - 0.065, y + 0.065, z - 0.08],
        [x - 0.025, y + 0.115, z - 0.07],
      ],
      [0.024, 0.019, 0],
      undefined,
      'cupped-opposed-thumb',
      10,
      7,
    );
    return;
  }

  k.path(
    skin,
    [
      [x, y + 0.06, z + 0.015],
      [x, y, z],
      [x + s * 0.015, y - 0.09, z - 0.025],
    ],
    [0.065, 0.068, 0.046],
    [0.04, 0.04, 0.025],
    'connected-palm',
    8,
    10,
  );
  for (let i = 0; i < 4; i++) {
    const dx = (i - 1.5) * 0.033;
    const length = [0.17, 0.215, 0.2, 0.16][i];
    const ys = [y - 0.06, y - length * 0.72, y - length];
    k.path(
      skin,
      [
        [x + dx, ys[0], z - 0.02],
        [x + dx + s * (0.02 + i * 0.003), ys[1], z - 0.06],
        [x + dx + s * (0.03 + i * 0.004), ys[2], z - 0.015],
      ],
      [0.018, 0.016, 0.009, 0],
      [0.015, 0.013, 0.008, 0],
      `finger-${i}`,
      8,
      6,
    );
  }
  k.path(
    skin,
    [
      [x - s * 0.045, y, z],
      [x - s * 0.1, y - 0.025, z - 0.065],
      [x - s * 0.105, y + 0.015, z - 0.09],
    ],
    [0.024, 0.018, 0],
    undefined,
    'opposed-thumb',
    8,
    7,
  );
}

/** Extrude four legs from actual openings in the trunk grid, sharing boundary vertices. */
export function branchedWolfCore(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const sides = 18,
    rows = 32,
    p = Array.from(g.getAttribute('position').array as ArrayLike<number>),
    uv = Array.from(g.getAttribute('uv').array as ArrayLike<number>),
    ix: number[] = [];
  const branches = [
    { row: 15, col: 1, side: 1, rear: false },
    { row: 15, col: 15, side: -1, rear: false },
    { row: 25, col: 1, side: 1, rear: true },
    { row: 25, col: 15, side: -1, rear: true },
  ];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < sides; i++) {
      if (branches.some((h) => j >= h.row && j < h.row + 2 && i >= h.col && i < h.col + 2)) continue;
      const a = j * (sides + 1) + i,
        b = a + sides + 1;
      ix.push(a, a + 1, b, a + 1, b + 1, b);
    }
  for (const h of branches) {
    const at = (j: number, i: number) => j * (sides + 1) + i;
    let ring = [
      at(h.row, h.col),
      at(h.row, h.col + 1),
      at(h.row, h.col + 2),
      at(h.row + 1, h.col + 2),
      at(h.row + 2, h.col + 2),
      at(h.row + 2, h.col + 1),
      at(h.row + 2, h.col),
      at(h.row + 1, h.col),
    ];
    const center = new THREE.Vector3();
    for (const id of ring) center.add(new THREE.Vector3(p[id * 3], p[id * 3 + 1], p[id * 3 + 2]));
    center.multiplyScalar(1 / 8);
    const angles = ring.map((id) => Math.atan2(p[id * 3 + 2] - center.z, p[id * 3] - center.x));
    const x = h.side * (h.rear ? 0.2 : 0.17),
      endZ = h.rear ? 0.28 : -0.51;
    const points = h.rear
      ? [
          center,
          new THREE.Vector3(h.side * 0.23, -0.12, 0.27),
          new THREE.Vector3(h.side * 0.22, -0.3, 0.43),
          new THREE.Vector3(x, -0.48, 0.34),
          new THREE.Vector3(x, -0.55, endZ),
          new THREE.Vector3(x, -0.6, endZ),
        ]
      : [
          center,
          new THREE.Vector3(x, -0.17, -0.32),
          new THREE.Vector3(x, -0.4, -0.42),
          new THREE.Vector3(x, -0.53, endZ),
          new THREE.Vector3(x, -0.6, endZ),
        ];
    const curve = new THREE.CatmullRomCurve3(points);
    const widths = h.rear ? [0.11, 0.105, 0.06, 0.055, 0.085, 0.08] : [0.1, 0.075, 0.055, 0.085, 0.08];
    const depths = h.rear ? [0.13, 0.12, 0.07, 0.055, 0.125, 0.12] : [0.1, 0.075, 0.055, 0.125, 0.12];
    for (let row = 1; row <= 14; row++) {
      const t = row / 14,
        c = curve.getPoint(t),
        q = t * (widths.length - 1),
        seg = Math.min(widths.length - 2, Math.floor(q)),
        f = q - seg,
        rx = THREE.MathUtils.lerp(widths[seg], widths[seg + 1], f),
        rz = THREE.MathUtils.lerp(depths[seg], depths[seg + 1], f),
        next: number[] = [];
      for (let i = 0; i < 8; i++) {
        next.push(p.length / 3);
        p.push(c.x + Math.cos(angles[i]) * rx, c.y, c.z + Math.sin(angles[i]) * rz);
        uv.push(i / 8, t);
      }
      for (let i = 0; i < 8; i++) {
        const j = (i + 1) % 8,
          a = ring[i],
          b = ring[j],
          cc = next[i],
          d = next[j];
        const A = new THREE.Vector3(p[a * 3], p[a * 3 + 1], p[a * 3 + 2]),
          B = new THREE.Vector3(p[b * 3], p[b * 3 + 1], p[b * 3 + 2]),
          C = new THREE.Vector3(p[cc * 3], p[cc * 3 + 1], p[cc * 3 + 2]);
        const n = B.clone().sub(A).cross(C.clone().sub(A)),
          radial = new THREE.Vector3((A.x + B.x + C.x) / 3 - c.x, 0, (A.z + B.z + C.z) / 3 - c.z);
        if (n.dot(radial) > 0) ix.push(a, b, cc, b, d, cc);
        else ix.push(a, cc, b, b, cc, d);
      }
      ring = next;
    }
    const c = curve.getPoint(1),
      end = p.length / 3;
    p.push(...c.toArray());
    uv.push(0.5, 1);
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8,
        A = new THREE.Vector3(p[ring[i] * 3], p[ring[i] * 3 + 1], p[ring[i] * 3 + 2]),
        B = new THREE.Vector3(p[ring[j] * 3], p[ring[j] * 3 + 1], p[ring[j] * 3 + 2]);
      if (A.clone().sub(c).cross(B.clone().sub(c)).y < 0) ix.push(end, ring[i], ring[j]);
      else ix.push(end, ring[j], ring[i]);
    }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(ix);
  g.deleteAttribute('normal');
  g.computeVertexNormals();
  return g;
}

/** Actual inset predator eyeball and pupil, seated against the evaluated skull surface. */
export function embeddedPredatorEye(
  k: CastleKit,
  skull: THREE.Mesh,
  side: number,
  x: number,
  y: number,
  size: number,
  name: string,
): void {
  skull.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(side * x, y, -5), new THREE.Vector3(0, 0, 1));
  const hit = ray.intersectObject(skull)[0];
  if (!hit) throw new Error(`${name} eye seating misses skull`);
  const normal = hit.face!.normal.clone().transformDirection(skull.matrixWorld).normalize();
  // Authored symmetric ocular tangent avoids a coarse nasal triangle tipping
  // one eye far sideways. The actual skin still governs every roof root.
  if (name === 'werewolf') normal.set(side * 0.25, 0, -Math.sqrt(1 - 0.25 * 0.25));
  const center = hit.point.clone().addScaledVector(normal, (name === 'werewolf' ? 0.006 : -0.0025) * size);
  const horizontal = new THREE.Vector3(0, 1, 0).cross(normal).normalize();
  const vertical = normal.clone().cross(horizontal).normalize();
  const orientation = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(horizontal, vertical, normal),
  );
  const eye = k.sphere(
    0xc79235,
    center.toArray() as [number, number, number],
    [0.029 * size, 0.012 * size, 0.009 * size],
    k.group,
    6,
    'eye',
  );
  eye.name = name + '-amber-eye';
  eye.quaternion.copy(orientation);
  if (name === 'werewolf') {
    // A closed shaped lens follows the actual lid aperture. Full ellipsoid
    // backs previously escaped the curved cheek as tiny secondary amber lobes.
    const positions: number[] = [0, 0, 0.009 * size],
      indices: number[] = [];
    const segments = 24,
      rings = 4;
    for (let r = 1; r <= rings; r++)
      for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2,
          t = r / rings;
        const x = 0.029 * size * Math.cos(a) * t;
        const y =
          ((Math.sin(a) > 0 ? 0.006 : 0.01) * size * Math.sin(a) - side * 0.18 * 0.029 * size * Math.cos(a)) * t;
        const q = (x / (0.029 * size)) ** 2 + (y / (0.012 * size)) ** 2;
        positions.push(x, y, 0.009 * size * Math.sqrt(Math.max(0, 1 - q)));
        const id = 1 + (r - 1) * segments + i,
          next = 1 + (r - 1) * segments + ((i + 1) % segments);
        if (r === 1) indices.push(0, id, next);
        else {
          const prior = id - segments,
            priorNext = next - segments;
          indices.push(prior, id, next, prior, next, priorNext);
        }
      }
    const back = positions.length / 3;
    positions.push(0, 0, -0.012 * size);
    for (let i = 0; i < segments; i++)
      indices.push(back, 1 + (rings - 1) * segments + ((i + 1) % segments), 1 + (rings - 1) * segments + i);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(
        positions.flatMap((_, i) =>
          i % 3 === 0 ? [0.5 + positions[i] / (0.06 * size), 0.5 + positions[i + 1] / (0.03 * size)] : [],
        ),
        2,
      ),
    );
    g.setIndex(indices);
    g.computeVertexNormals();
    eye.geometry.dispose();
    eye.geometry = g;
    eye.scale.set(1, 1, 1);
  }
  const pupilCenter =
    name === 'werewolf'
      ? center.clone().addScaledVector(normal, 0.0095 * size)
      : hit.point.clone().addScaledVector(normal, 0.007 * size);
  const pupil = k.sphere(
    0x15121a,
    pupilCenter.toArray() as [number, number, number],
    [0.005 * size, 0.005 * size, 0.0013 * size],
    k.group,
    6,
    'eye',
  );
  pupil.name = name + '-pupil';
  pupil.quaternion.copy(orientation);
  if (name === 'werewolf' || name === 'wolf' || name === 'bat') {
    // Continuous fur orbital roof bridges the recessed lens to the actual skull.
    // Upper aperture cuts the amber globe; it is not an eyebrow floating above it.
    const positions: number[] = [],
      uv: number[] = [],
      indices: number[] = [];
    const segments = name === 'werewolf' ? 24 : 16;
    const bands = name === 'werewolf' ? 5 : 3;
    if (name === 'werewolf') eye.updateMatrixWorld(true);
    for (let band = 0; band < bands; band++) {
      for (let i = 0; i <= segments; i++) {
        const angle = ((name === 'werewolf' ? 1 : 2) * Math.PI * i) / segments;
        const dx = 0.029 * size * Math.cos(angle);
        const dy = (Math.sin(angle) > 0 ? 0.006 : 0.01) * size * Math.sin(angle) - side * 0.18 * dx;
        const q = (dx / (0.029 * size)) ** 2 + (dy / (0.012 * size)) ** 2;
        const inner = center
          .clone()
          .addScaledVector(horizontal, dx)
          .addScaledVector(vertical, dy)
          .addScaledVector(normal, 0.009 * size * Math.sqrt(Math.max(0, 1 - q)) + 0.0004);
        const target = hit.point
          .clone()
          .addScaledVector(horizontal, 0.044 * size * Math.cos(angle))
          .addScaledVector(vertical, 0.027 * size * Math.sin(angle));
        const probe = new THREE.Raycaster(new THREE.Vector3(target.x, target.y, -5), new THREE.Vector3(0, 0, 1));
        const surface = probe.intersectObject(skull)[0];
        if (!surface) throw new Error(`Chief orbital roof misses skull ${target.x},${target.y}`);
        const outer = surface.point.clone().addScaledVector(normal, name === 'werewolf' ? 0.0005 : -0.0005);
        const t = band / (bands - 1);
        const point = outer.lerp(inner, t);
        if (name === 'werewolf') {
          point.addScaledVector(normal, 0.005 * Math.sin(Math.PI * t) * Math.max(0, Math.sin(angle)));
          const probe = new THREE.Raycaster(new THREE.Vector3(point.x, point.y, -5), new THREE.Vector3(0, 0, 1));
          const support = probe.intersectObjects([skull, eye], false)[0];
          if (support) point.z = Math.min(point.z, support.point.z - 0.0008);
        } else if (band === 1) point.addScaledVector(normal, 0.012 * Math.max(0, Math.sin(angle)));
        positions.push(...point.toArray());
        uv.push(i / segments, band / (bands - 1));
      }
    }
    for (let band = 0; band < bands - 1; band++)
      for (let i = 0; i < segments; i++) {
        const a = band * (segments + 1) + i,
          b = a + segments + 1;
        for (const tri of [
          [a, a + 1, b],
          [a + 1, b + 1, b],
        ]) {
          const v = tri.map((index) => new THREE.Vector3().fromArray(positions, index * 3));
          if (v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).dot(normal) < 0) tri.reverse();
          indices.push(...tri);
        }
      }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    if (name === 'werewolf') {
      const normals = geometry.getAttribute('normal');
      for (let i = 0; i <= segments; i++) {
        const point = new THREE.Vector3().fromArray(positions, i * 3);
        const probe = new THREE.Raycaster(new THREE.Vector3(point.x, point.y, -5), new THREE.Vector3(0, 0, 1));
        const support = probe.intersectObject(skull)[0];
        if (support?.normal) {
          const n = support.normal.clone().transformDirection(skull.matrixWorld);
          normals.setXYZ(i, n.x, n.y, n.z);
        }
      }
    }
    const lid = k.mesh(geometry, name === 'bat' ? 0x292630 : 0x49464b);
    lid.name = name + '-continuous-orbital-fur-roof';
  }
}
