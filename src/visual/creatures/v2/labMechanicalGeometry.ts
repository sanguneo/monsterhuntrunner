import * as THREE from 'three';
import type { Ring } from '../../SculptKit';
import type { Vec3 } from '../../ModelKit';
import { ZLKit, closeRings } from './zombieLabTools';
/** Rounded rectangular manufactured sections with continuous bevelled corners, not organic ellipsoids. */
export function mechanicalHull(rings: readonly Ring[], rows = 10, sides = 24): THREE.BufferGeometry {
  const shape = new THREE.CatmullRomCurve3(rings.map((r) => new THREE.Vector3(r[1], r[0], r[2]))),
    centers = new THREE.CatmullRomCurve3(rings.map((r) => new THREE.Vector3(r[3] ?? 0, r[0], r[4] ?? 0)));
  const p: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= sides; i++) {
      const t = j / rows,
        r = shape.getPoint(t),
        c = centers.getPoint(t),
        a = (i / sides) * Math.PI * 2,
        s = Math.sin(a),
        co = Math.cos(a);
      p.push(
        c.x + Math.sign(s) * Math.pow(Math.abs(s), 0.48) * r.x,
        r.y,
        c.z + Math.sign(co) * Math.pow(Math.abs(co), 0.48) * r.z,
      );
      uv.push(i / sides, t);
      if (j < rows && i < sides) {
        const q = j * (sides + 1) + i,
          b = q + sides + 1;
        idx.push(q, q + 1, b, q + 1, b + 1, b);
      }
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return closeRings(g, sides);
}
export function mechanicalBody(
  k: ZLKit,
  name: string,
  color: number,
  rings: readonly Ring[],
  rows = 10,
  sides = 24,
): THREE.Mesh {
  return k.part(name, color, mechanicalHull(rings, rows, sides), 'metal');
}
export function articulatedFinger(
  k: ZLKit,
  points: Vec3[],
  width: number,
  depth: number,
  steel: number,
  joint: number,
): void {
  for (let link = 0; link < points.length - 1; link++) {
    const a = new THREE.Vector3(...points[link]),
      b = new THREE.Vector3(...points[link + 1]),
      axis = b.clone().sub(a),
      length = axis.length(),
      p: number[] = [],
      uv: number[] = [],
      idx: number[] = [];
    const cross = [
      [-0.7, -1],
      [0.7, -1],
      [1, -0.7],
      [1, 0.7],
      [0.7, 1],
      [-0.7, 1],
      [-1, 0.7],
      [-1, -0.7],
    ];
    for (const y of [-length / 2, length / 2])
      for (let i = 0; i < 8; i++) {
        p.push(cross[i][0] * width, y, cross[i][1] * depth);
        uv.push(i / 8, y / length + 0.5);
      }
    for (let i = 0; i < 8; i++) {
      const n = (i + 1) % 8;
      idx.push(i, n, i + 8, n, n + 8, i + 8);
    }
    p.push(0, -length / 2, 0, 0, length / 2, 0);
    uv.push(0.5, 0, 0.5, 1);
    for (let i = 0; i < 8; i++) {
      const n = (i + 1) % 8;
      idx.push(16, n, i, 17, i + 8, n + 8);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = k.part('beveled-metal-finger-phalanx', steel, g, 'metal');
    m.position.copy(a.add(b).multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
  }
  const q = k.cylinder(joint, points[1], depth * 1.05, depth * 1.05, width * 2.3, k.group, 8, 'metal');
  q.rotation.z = Math.PI / 2;
  q.name = 'dark-articulated-finger-knuckle';
}
