/** Derive a hair shell from actual anatomical triangles, not a coarse intersecting ellipsoid.
 * Original CC0 head provenance in THIRD_PARTY_ART_SOURCES; all fitting/export code original.
 */
import * as THREE from 'three';
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { authoredSchoolFace as girl } from '../../src/visual/creatures/v2/generated/schoolGirlFace';
const head = girl.find((p) => p.name === 'authored-school-face')!;
type Vertex = { p: THREE.Vector3; n: THREE.Vector3 };
const signed = (v: Vertex) =>
  v.p.y -
  (2.59 +
    (0.055 + 0.065 * Math.exp(-(((v.p.x + 0.012) / 0.052) ** 2))) *
      THREE.MathUtils.clamp((-v.p.z + 0.02) / 0.14, 0, 1));
const positions: number[] = [],
  normals: number[] = [],
  uv: number[] = [];
for (let i = 0; i < head.position.length; i += 9) {
  let polygon: Vertex[] = [0, 3, 6].map((j) => ({
    p: new THREE.Vector3(...(Array.from(head.position.slice(i + j, i + j + 3)) as [number, number, number])),
    n: new THREE.Vector3(...(Array.from(head.normal.slice(i + j, i + j + 3)) as [number, number, number])),
  }));
  const out: Vertex[] = [];
  for (let j = 0; j < polygon.length; j++) {
    const a = polygon[j],
      b = polygon[(j + 1) % polygon.length],
      da = signed(a),
      db = signed(b);
    if (da >= 0) out.push(a);
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db);
      out.push({ p: a.p.clone().lerp(b.p, t), n: a.n.clone().lerp(b.n, t).normalize() });
    }
  }
  polygon = out;
  for (let j = 1; j < polygon.length - 1; j++)
    for (const v of [polygon[0], polygon[j], polygon[j + 1]]) {
      const n = v.n.clone().normalize(),
        p = v.p.clone().addScaledVector(n, 0.004);
      p.y += 0.06; // Existing hair assembly offset remains.
      positions.push(p.x, p.y, p.z);
      normals.push(n.x, n.y, n.z);
      uv.push(0.5 + Math.atan2(p.x, p.z - 0.015) / (Math.PI * 2), (p.y - 2.59) / 0.32);
    }
}
const values = [...positions, ...normals, ...uv];
const metadata = {
  name: 'fitted-specter-crown',
  position: [0, positions.length],
  normal: [positions.length, normals.length],
  uv: [positions.length + normals.length, uv.length],
  color: [values.length, 0],
};
const bytes = Buffer.from(Float32Array.from(values).buffer),
  packed = { data: bytes.toString('base64'), parts: [metadata] };
writeFileSync(
  'src/visual/creatures/v2/generated/schoolGirlCrown.ts',
  '// Exact anatomical triangle-derived hair shell; provenance and generator retained.\nimport { decodeAuthoredMeshes } from "../DecodedAuthoredMesh";\nexport const schoolGirlCrown=decodeAuthoredMeshes(' +
    JSON.stringify(packed) +
    ')[0];\n',
);
console.log(
  'ANATOMICAL_CROWN',
  positions.length / 9,
  'triangles',
  bytes.length,
  createHash('sha256').update(bytes).digest('hex'),
);
