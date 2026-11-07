import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { SculptKit, loftGeometry, sweepGeometry, type Ring } from '../../SculptKit';
import type { Vec3, Surface } from '../../ModelKit';

/** Local authoring tools only; no shared runtime/accepted assets are modified. */
export class ZLKit extends SculptKit {
  constructor(private readonly detail = 1) {
    super();
  }
  part(name: string, color: number, geometry: THREE.BufferGeometry, surface: Surface = 'cloth'): THREE.Mesh {
    const mesh = this.mesh(geometry, color, [0, 0, 0], [1, 1, 1], this.group, surface);
    mesh.name = name;
    return mesh;
  }
  curve(
    name: string,
    color: number,
    points: readonly Vec3[],
    radii: readonly number[],
    depth = radii,
    steps = 12,
    sides = 8,
    surface: Surface = 'cloth',
  ): THREE.Mesh {
    return this.part(
      name,
      color,
      closeRings(sweepGeometry(points, radii, depth, Math.max(2, Math.round(steps * this.detail)), sides), sides),
      surface,
    );
  }
  body(
    name: string,
    color: number,
    rings: readonly Ring[],
    rows = 20,
    sides = 18,
    surface: Surface = 'cloth',
  ): THREE.Mesh {
    return this.part(
      name,
      color,
      closeRings(loftGeometry(rings, Math.max(2, Math.round(rows * this.detail)), sides), sides),
      surface,
    );
  }
  /** Authored planes/shells, not stacks of cubes. */
  plate(
    name: string,
    color: number,
    points: readonly Vec3[],
    thickness = 0.015,
    surface: Surface = 'cloth',
  ): THREE.Mesh {
    const p: number[] = [],
      indices: number[] = [];
    for (const offset of [0, thickness]) for (const v of points) p.push(v[0], v[1], v[2] + offset);
    for (let i = 1; i < points.length - 1; i++)
      indices.push(0, i + 1, i, points.length, points.length + i, points.length + i + 1);
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      indices.push(i, j, i + points.length, j, j + points.length, i + points.length);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return this.part(name, color, g, surface);
  }
}

export function fitCreature(group: THREE.Group, boss: boolean, desiredHeight?: number): THREE.Group {
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group),
    size = box.getSize(new THREE.Vector3());
  const height = desiredHeight ?? (boss ? 2.95 : 1.23);
  const s = Math.min(height / size.y, (boss ? 2.82 : 1.48) / size.x, (boss ? 2.12 : 1.85) / size.z);
  const center = box.getCenter(new THREE.Vector3());
  const wrapper = new THREE.Group();
  wrapper.name = group.name;
  group.scale.setScalar(s);
  group.position.set(-center.x * s, boss ? -box.min.y * s : -center.y * s + 0.035, -center.z * s);
  wrapper.add(group);
  wrapper.updateMatrixWorld(true);
  return wrapper;
}

/** Project every face-detail sample onto a specific skull, never onto other decorations. */
export function frontSurface(mesh: THREE.Mesh, x: number, y: number, offset = 0.009): Vec3 {
  mesh.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(x, y, -6), new THREE.Vector3(0, 0, 1));
  const hit = ray.intersectObject(mesh, false)[0];
  if (!hit?.face) throw new Error(`Missing authored facial surface: ${mesh.name} ${x},${y}`);
  const normal = hit.face.normal.clone().transformDirection(mesh.matrixWorld);
  return hit.point.addScaledVector(normal, offset).toArray() as [number, number, number];
}

export function almond(
  k: ZLKit,
  skull: THREE.Mesh,
  cx: number,
  cy: number,
  width: number,
  height: number,
  side: number,
  color: number,
  name: string,
  offset = 0.014,
): void {
  const pts: Vec3[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2,
      x = Math.cos(a) * width;
    pts.push(frontSurface(skull, cx + x, cy + Math.sin(a) * height + side * x * 0.22, offset));
  }
  k.plate(name, color, pts, 0.004, color === 0xffa425 ? 'glow' : 'cloth');
}

export function severeFace(k: ZLKit, skull: THREE.Mesh, cy: number, spread: number, size: number, skin: number): void {
  for (const side of [-1, 1]) {
    almond(k, skull, side * spread, cy, 0.115 * size, 0.045 * size, side, 0x202b26, 'recessed-hostile-eye-socket');
    almond(
      k,
      skull,
      side * spread,
      cy - 0.003 * size,
      0.057 * size,
      0.021 * size,
      side,
      0xffa425,
      'narrow-ember-iris',
      0.022,
    );
    const brow: Vec3[] = [-1, 0, 1].map((n) =>
      frontSurface(skull, side * spread + n * 0.12 * size, cy + 0.058 * size + side * n * 0.018 * size, 0.025),
    );
    k.curve('continuous-heavy-brow', skin, brow, [0.012 * size, 0.042 * size, 0.014 * size], undefined, 8, 6);
  }
  const mouth: Vec3[] = [-1, -0.5, 0, 0.5, 1].map((n) =>
    frontSurface(skull, n * 0.23 * size, cy - 0.22 * size - Math.abs(n) * 0.035 * size, 0.016),
  );
  k.curve(
    'stern-mouth-seam',
    0x202b26,
    mouth,
    [0.006 * size, 0.012 * size, 0.014 * size, 0.012 * size, 0.006 * size],
    undefined,
    12,
    5,
  );
  for (const side of [-1, 1]) {
    const p = frontSurface(skull, side * 0.16 * size, cy - 0.17 * size, 0.025);
    k.curve(
      'small-intact-canine',
      0xdad4ae,
      [p, [p[0], p[1] - 0.07 * size, p[2] - 0.008]],
      [0.025 * size, 0.001],
      undefined,
      5,
      6,
    );
  }
}

/** Complete attributes and explicitly close authoring rings; never leave hollow joints. */
export function closeRings(g: THREE.BufferGeometry, sides: number): THREE.BufferGeometry {
  const pos = g.getAttribute('position'),
    uv = g.getAttribute('uv');
  const p = Array.from(pos.array),
    u = uv ? Array.from(uv.array) : new Array(pos.count * 2).fill(0);
  const idx = Array.from(g.index!.array);
  for (const [start, reverse] of [
    [0, true],
    [pos.count - sides - 1, false],
  ] as const) {
    const center = new THREE.Vector3();
    for (let i = 0; i < sides; i++) center.add(new THREE.Vector3().fromBufferAttribute(pos, start + i));
    center.divideScalar(sides);
    const n = p.length / 3;
    p.push(...center.toArray());
    u.push(0.5, 0.5);
    for (let i = 0; i < sides; i++) {
      if (reverse) idx.push(n, start + i + 1, start + i);
      else idx.push(n, start + i, start + i + 1);
    }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
  g.deleteAttribute('normal');
  g.setIndex(idx);
  g.computeVertexNormals();
  const normal = g.getAttribute('normal');
  for (let j = 0; j < pos.count / (sides + 1); j++) {
    const a = j * (sides + 1),
      b = a + sides;
    const n = new THREE.Vector3()
      .fromBufferAttribute(normal, a)
      .add(new THREE.Vector3().fromBufferAttribute(normal, b))
      .normalize();
    normal.setXYZ(a, n.x, n.y, n.z);
    normal.setXYZ(b, n.x, n.y, n.z);
  }
  return g;
}
/** Single continuous SDF skin, sampled once at cached construction, not overlapping limb shells. */
export function joinedBruteSkin(
  wrists: readonly Vec3[],
  resolution: number,
  slender = false,
  fidelity = false,
  bruteDetail = false,
): THREE.BufferGeometry {
  const material = new THREE.MeshStandardMaterial();
  const mc = new MarchingCubes(resolution, material, false, false, 18000);
  mc.isolation = 0;
  const lo = new THREE.Vector3(-1.7, -0.3, -1.1),
    size = new THREE.Vector3(3.4, 3.2, 2.2);
  const smooth = (a: number, b: number, k = 0.15) => {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  };
  const paths = wrists.map((w, i) => {
    const side = i === 0 ? -1 : 1;
    if (bruteDetail) {
      const low = w[1] < 0.6;
      return [
        [side * 0.4, 2.12, 0, 0.26],
        [side * 0.67, 1.98, -0.015, 0.32],
        [side * 0.82, 1.72, -0.035, 0.29],
        [side * (low ? 0.98 : 0.82), low ? 1.18 : 1.43, -0.045, 0.19],
        [(side * (low ? 0.98 : 0.82) + w[0]) * 0.5, ((low ? 1.18 : 1.43) + w[1]) * 0.5, (-0.045 + w[2]) * 0.5, 0.255],
        [...w, 0.19],
      ];
    }
    if (slender && fidelity)
      return [
        [side * 0.27, 2.12, 0, 0.18],
        [side * 0.48, 2.07, -0.015, 0.25],
        [side * 0.66, 1.83, -0.035, 0.21],
        [side * 0.75, 1.62, -0.08, 0.15],
        [(side * 0.75 + w[0]) * 0.5, (1.62 + w[1]) * 0.5, (-0.08 + w[2]) * 0.5, 0.175],
        [...w, 0.13],
      ];
    if (slender)
      return [
        [side * 0.27, 2.12, 0, 0.18],
        [side * 0.6, 1.98, -0.02, 0.25],
        [side * 0.75, 1.62, -0.08, 0.19],
        [...w, 0.15],
      ];
    return [
      [side * 0.42, 2.12, 0, 0.28],
      [side * 0.72, 1.93, -0.02, 0.32],
      [side * 0.94, w[1] < 0.6 ? 1.25 : 1.55, -0.02, 0.26],
      [...w, 0.2],
    ];
  });
  // Precompute capsule segments; scalar field evaluation avoids hundreds of thousands of temporary vectors.
  const segments = paths.flatMap((path) =>
    path.slice(0, -1).map((a, i) => {
      const b = path[i + 1],
        dx = b[0] - a[0],
        dy = b[1] - a[1],
        dz = b[2] - a[2];
      return { ax: a[0], ay: a[1], az: a[2], dx, dy, dz, len2: dx * dx + dy * dy + dz * dz, r0: a[3], r1: b[3] };
    }),
  );
  for (let z = 0; z < resolution; z++)
    for (let y = 0; y < resolution; y++)
      for (let x = 0; x < resolution; x++) {
        const px = lo.x + (x / resolution) * size.x,
          py = lo.y + (y / resolution) * size.y,
          pz = lo.z + (z / resolution) * size.z;
        const qx = px / (fidelity ? 0.39 + 0.14 * Math.exp(-Math.pow((py - 1.98) / 0.38, 2)) : slender ? 0.51 : 0.62),
          qy = fidelity ? (py - 1.713) / 0.73 : (py - 1.61) / 0.84,
          qz = pz / (slender ? 0.29 : 0.37);
        let d = (Math.sqrt(qx * qx + qy * qy + qz * qz) - 1) * 0.37;
        if (fidelity) {
          const ellipsoid = (cx: number, cy: number, cz: number, rx: number, ry: number, rz: number) => {
            const x = (px - cx) / rx,
              y = (py - cy) / ry,
              z = (pz - cz) / rz;
            return (Math.sqrt(x * x + y * y + z * z) - 1) * Math.min(rx, ry, rz);
          };
          for (const side of [-1, 1]) d = smooth(d, ellipsoid(side * 0.22, 1.98, -0.14, 0.31, 0.25, 0.19), 0.085);
          for (const y of [1.38, 1.57, 1.76])
            for (const side of [-1, 1]) d = smooth(d, ellipsoid(side * 0.115, y, -0.19, 0.15, 0.135, 0.105), 0.045);
          for (const w of wrists) d = smooth(d, ellipsoid(w[0], w[1] + 0.075, w[2] - 0.14, 0.195, 0.18, 0.115), 0.065);
        }

        for (const s of segments) {
          const ax = px - s.ax,
            ay = py - s.ay,
            az = pz - s.az;
          const t = THREE.MathUtils.clamp((ax * s.dx + ay * s.dy + az * s.dz) / s.len2, 0, 1);
          const r = s.r0 * (1 - t) + s.r1 * t;
          const dx = ax + s.dx * -t,
            dy = ay + s.dy * -t,
            dz = az + s.dz * -t;
          d = smooth(d, Math.sqrt(dx * dx + dy * dy + dz * dz) - r, fidelity ? 0.045 : 0.15);
        }
        if ((fidelity || bruteDetail) && Math.abs(px) > 0.52 && Math.abs(px) < 0.8 && py > 1.68 && py < 2.13) {
          const plane = -pz - ((bruteDetail ? 0.255 : 0.215) + 0.045 * Math.exp(-Math.pow((py - 2.06) / 0.12, 2)));
          d = -smooth(-d, -plane, 0.025);
        }
        mc.field[x + y * resolution + z * resolution * resolution] = -d;
      }
  mc.update();
  const g = new THREE.BufferGeometry(),
    p = mc.positionArray.slice(0, mc.count * 3),
    n = mc.normalArray.slice(0, mc.count * 3);
  for (let i = 0; i < p.length; i += 3) {
    p[i] = lo.x + ((p[i] + 1) * size.x) / 2;
    p[i + 1] = lo.y + ((p[i + 1] + 1) * size.y) / 2;
    p[i + 2] = lo.z + ((p[i + 2] + 1) * size.z) / 2;
    const v = new THREE.Vector3(n[i] / size.x, n[i + 1] / size.y, n[i + 2] / size.z).normalize();
    n[i] = v.x;
    n[i + 1] = v.y;
    n[i + 2] = v.z;
  }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  mc.geometry.dispose();
  material.dispose();
  return g;
}
/** Dense surface-following cloth panel avoids polygon fan chords intersecting rounded skin. */
export function tailoredPanel(k: ZLKit, skin: THREE.Mesh, side: number, color: number): void {
  const positions: number[] = [],
    idx: number[] = [];
  const rows = 18,
    cols = 6;
  for (let j = 0; j <= rows; j++) {
    const t = j / rows,
      y = 0.91 + t * 1.31;
    const inner = 0.16 + 0.045 * Math.sin(t * Math.PI),
      outer = 0.27 + 0.28 * Math.sin(t * Math.PI * 0.84);
    for (let i = 0; i <= cols; i++) {
      const x = side * (inner + ((outer - inner) * i) / cols);
      positions.push(...frontSurface(skin, x, y, 0.035));
      if (j < rows && i < cols) {
        const a = j * (cols + 1) + i,
          b = a + cols + 1;
        if (side > 0) idx.push(a, b, a + 1, a + 1, b, b + 1);
        else idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mesh = k.part('tailored-surface-following-vest', color, g, 'leather');
  (mesh.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
}

/** Curved garment polygon with barycentric subdivision, projecting every interior sample. */
export function skinPanel(
  k: ZLKit,
  skin: THREE.Mesh,
  xy: readonly [number, number][],
  color: number,
  name: string,
  steps = 5,
  surface: Surface = 'leather',
  trim = true,
  offset = 0.045,
  preserveProjectedOutline = false,
): void {
  const cx = xy.reduce((s, p) => s + p[0], 0) / xy.length,
    cy = xy.reduce((s, p) => s + p[1], 0) / xy.length;
  const positions: number[] = [],
    idx: number[] = [];
  for (let edge = 0; edge < xy.length; edge++) {
    const a = xy[edge],
      b = xy[(edge + 1) % xy.length];
    const rows: number[][] = [];
    for (let j = 0; j <= steps; j++) {
      const row: number[] = [];
      for (let i = 0; i <= j; i++) {
        const t = j / steps,
          u = j ? i / j : 0;
        const x = cx * (1 - t) + (a[0] * (1 - u) + b[0] * u) * t,
          y = cy * (1 - t) + (a[1] * (1 - u) + b[1] * u) * t;
        row.push(positions.length / 3);
        const point = frontSurface(skin, x, y, preserveProjectedOutline ? 0 : offset);
        positions.push(point[0], point[1], point[2] - (preserveProjectedOutline ? offset : 0));
      }
      rows.push(row);
    }
    for (let j = 0; j < steps; j++)
      for (let i = 0; i <= j; i++) {
        idx.push(rows[j][i], rows[j + 1][i + 1], rows[j + 1][i]);
        if (i < j) idx.push(rows[j][i], rows[j][i + 1], rows[j + 1][i + 1]);
      }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const shell = surface === 'metal' ? thinClosedShell(g, 0.012) : g;
  const m = k.part(name, color, shell, surface);
  (m.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  if (!trim) return;
  for (let edge = 0; edge < xy.length; edge++) {
    const a = xy[edge],
      b = xy[(edge + 1) % xy.length];
    const path: Vec3[] = [];
    for (let i = 0; i <= 5; i++)
      path.push(
        frontSurface(skin, THREE.MathUtils.lerp(a[0], b[0], i / 5), THREE.MathUtils.lerp(a[1], b[1], i / 5), 0.055),
      );
    k.curve(
      name + '-sewn-raised-edge',
      0x7c5d40,
      path,
      [0.012, 0.012, 0.012, 0.012, 0.012, 0.012],
      undefined,
      6,
      5,
      'leather',
    );
  }
}

export function sideSurface(mesh: THREE.Mesh, side: number, y: number, z: number, offset = 0.006): Vec3 {
  mesh.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(side * 6, y, z), new THREE.Vector3(-side, 0, 0));
  const hit = ray.intersectObject(mesh, false)[0];
  if (!hit?.face) throw new Error(`Missing side surface ${mesh.name}: ${y},${z}`);
  return hit.point.addScaledVector(hit.face.normal.clone().transformDirection(mesh.matrixWorld), offset).toArray() as [
    number,
    number,
    number,
  ];
}

/** Closed authored armor thickness: front and back skins plus real perimeter walls, not floating cards. */
function thinClosedShell(input: THREE.BufferGeometry, thickness: number): THREE.BufferGeometry {
  input.deleteAttribute('normal');
  const g = mergeVertices(input, 1e-5),
    p = g.getAttribute('position');
  const positions = Array.from(p.array),
    index = Array.from(g.index!.array),
    edges = new Map<string, { a: number; b: number; count: number }>();
  for (let i = 0; i < index.length; i += 3)
    for (let n = 0; n < 3; n++) {
      const a = index[i + n],
        b = index[i + ((n + 1) % 3)],
        key = [a, b].sort((a, b) => a - b).join(',');
      const e = edges.get(key);
      if (e) e.count++;
      else edges.set(key, { a, b, count: 1 });
    }
  for (let i = 0; i < p.count; i++) positions.push(p.getX(i), p.getY(i), p.getZ(i) + thickness);
  const out = index.slice();
  for (let i = 0; i < index.length; i += 3)
    out.push(index[i] + p.count, index[i + 2] + p.count, index[i + 1] + p.count);
  for (const { a, b, count } of edges.values())
    if (count === 1) out.push(a, b, b + p.count, a, b + p.count, a + p.count);
  const shell = new THREE.BufferGeometry();
  shell.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  shell.setIndex(out);
  shell.computeVertexNormals();
  g.dispose();
  input.dispose();
  return shell;
}
