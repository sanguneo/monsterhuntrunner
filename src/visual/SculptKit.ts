import * as THREE from 'three';
import { ModelKit, type Surface, type Vec3 } from './ModelKit';

/** Ring profiles are authored silhouettes, not stacks of intersecting primitives.
 * y, horizontal radius, depth radius, optional x and z centre offsets. */
export type Ring = readonly [number, number, number, number?, number?];

export function loftGeometry(profile: readonly Ring[], rings = 28, sides = 24): THREE.BufferGeometry {
  const shape = new THREE.CatmullRomCurve3(
    profile.map((p) => new THREE.Vector3(p[1], p[0], p[2])),
    false,
    'centripetal',
  );
  const center = new THREE.CatmullRomCurve3(
    profile.map((p) => new THREE.Vector3(p[3] ?? 0, p[0], p[4] ?? 0)),
    false,
    'centripetal',
  );
  const positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  for (let j = 0; j <= rings; j++) {
    const t = j / rings,
      r = shape.getPoint(t),
      c = center.getPoint(t);
    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      positions.push(c.x + Math.max(0.0001, r.x) * Math.sin(angle), r.y, c.z + Math.max(0.0001, r.z) * Math.cos(angle));
      uv.push(i / sides, t);
      if (j < rings && i < sides) {
        const a = j * (sides + 1) + i,
          b = a + sides + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const normals = geometry.getAttribute('normal');
  const n = new THREE.Vector3();
  for (let j = 0; j <= rings; j++) {
    const a = j * (sides + 1),
      b = a + sides;
    n.set(
      normals.getX(a) + normals.getX(b),
      normals.getY(a) + normals.getY(b),
      normals.getZ(a) + normals.getZ(b),
    ).normalize();
    normals.setXYZ(a, n.x, n.y, n.z);
    normals.setXYZ(b, n.x, n.y, n.z);
  }
  return geometry;
}

/** Variable-section curved sweep with closed, tapered tips. */
export function sweepGeometry(
  points: readonly Vec3[],
  widths: readonly number[],
  depths = widths,
  steps = 24,
  sides = 12,
): THREE.BufferGeometry {
  const path = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
    false,
    'centripetal',
  );
  const frames = path.computeFrenetFrames(steps, false);
  const positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  const interpolate = (a: readonly number[], t: number) => {
    const p = t * (a.length - 1),
      i = Math.min(a.length - 2, Math.floor(p));
    const f = p - i;
    return a[i] + (a[i + 1] - a[i]) * (f * f * (3 - 2 * f));
  };
  for (let j = 0; j <= steps; j++) {
    const t = j / steps,
      c = path.getPointAt(t);
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const p = c
        .clone()
        .addScaledVector(frames.normals[j], Math.cos(a) * interpolate(widths, t))
        .addScaledVector(frames.binormals[j], Math.sin(a) * interpolate(depths, t));
      positions.push(p.x, p.y, p.z);
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
  const normals = g.getAttribute('normal');
  for (let j = 0; j <= steps; j++) {
    const a = j * (sides + 1),
      b = a + sides;
    const n = new THREE.Vector3(
      normals.getX(a) + normals.getX(b),
      normals.getY(a) + normals.getY(b),
      normals.getZ(a) + normals.getZ(b),
    ).normalize();
    normals.setXYZ(a, n.x, n.y, n.z);
    normals.setXYZ(b, n.x, n.y, n.z);
  }
  return g;
}

export class SculptKit extends ModelKit {
  constructor() {
    super(1);
  }
  loft(
    color: number,
    profile: readonly Ring[],
    position: Vec3 = [0, 0, 0],
    parent = this.group,
    surface: Surface = 'cloth',
    rings = 28,
    sides = 24,
  ): THREE.Mesh {
    return this.mesh(loftGeometry(profile, rings, sides), color, position, [1, 1, 1], parent, surface);
  }
  sweep(
    color: number,
    points: readonly Vec3[],
    widths: readonly number[],
    depths = widths,
    parent = this.group,
    surface: Surface = 'cloth',
    steps = 24,
  ): THREE.Mesh {
    return this.mesh(sweepGeometry(points, widths, depths, steps), color, [0, 0, 0], [1, 1, 1], parent, surface);
  }
  eye(position: Vec3, size = 1, parent = this.group, color = 0x242436): void {
    this.sphere(color, position, [0.065 * size, 0.085 * size, 0.022 * size], parent, 16, 'eye');
    this.sphere(
      0xfffbeb,
      [position[0] - 0.018 * size, position[1] + 0.028 * size, position[2] - 0.019 * size],
      [0.018 * size, 0.022 * size, 0.006 * size],
      parent,
      10,
      'eye',
    );
  }
  /** Attach flat facial detail to the actual authored surface, not a guessed plane. */
  surfacePoint(position: Vec3): { point: THREE.Vector3; normal: THREE.Vector3 } {
    this.group.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(position[0], position[1], -5), new THREE.Vector3(0, 0, 1));
    const hit = ray
      .intersectObject(this.group, true)
      .find((h) => h.object instanceof THREE.Mesh && !h.object.userData.facialDetail);
    if (!hit || !hit.face) return { point: new THREE.Vector3(...position), normal: new THREE.Vector3(0, 0, -1) };
    return { point: hit.point, normal: hit.face.normal.clone().transformDirection(hit.object.matrixWorld) };
  }
  surfaceEye(position: Vec3, size = 1, _parent = this.group, color = 0x242436): void {
    const hit = this.surfacePoint(position);
    const pivot = new THREE.Group();
    pivot.position.copy(hit.point).addScaledVector(hit.normal, 0.012 * size);
    pivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), hit.normal);
    this.group.add(pivot);
    this.eye([0, 0, 0], size, pivot, color);
    pivot.traverse((o) => {
      o.userData.facialDetail = true;
    });
  }
  surfaceFace(y: number, z: number, spread = 0.135, size = 1): void {
    for (const side of [-1, 1]) {
      this.surfaceEye([side * spread, y, z], size);
      const hit = this.surfacePoint([side * (spread + 0.07 * size), y - 0.09 * size, z]);
      const cheek = this.sphere(
        0xeaa4ad,
        [hit.point.x, hit.point.y, hit.point.z],
        [0.04 * size, 0.016 * size, 0.003],
        this.group,
        12,
      );
      cheek.position.addScaledVector(hit.normal, 0.003);
      cheek.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), hit.normal);
      cheek.userData.facialDetail = true;
    }
    const points: Vec3[] = [
      [-0.045 * size, y - 0.12 * size, z],
      [0, y - 0.135 * size, z],
      [0.045 * size, y - 0.12 * size, z],
    ].map((p) => {
      const hit = this.surfacePoint(p as unknown as Vec3);
      hit.point.addScaledVector(hit.normal, 0.006);
      return hit.point.toArray() as [number, number, number];
    });
    const mouth = this.sweep(0x443247, points, [0.002, 0.008 * size, 0.002], undefined, this.group, 'cloth', 12);
    mouth.userData.facialDetail = true;
  }
  face(y: number, z: number, spread = 0.135, size = 1): void {
    for (const side of [-1, 1]) {
      this.eye([side * spread, y, z], size);
      this.sphere(
        0xeaa4ad,
        [side * (spread + 0.07 * size), y - 0.09 * size, z + 0.018],
        [0.044 * size, 0.018 * size, 0.006],
        this.group,
        12,
      );
    }
    this.sweep(
      0x443247,
      [
        [-0.045 * size, y - 0.12 * size, z - 0.006],
        [0, y - 0.135 * size, z - 0.01],
        [0.045 * size, y - 0.12 * size, z - 0.006],
      ],
      [0.002, 0.009 * size, 0.002],
      undefined,
      this.group,
      'cloth',
      12,
    );
  }
}
