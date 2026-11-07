import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { buildSeaBoss } from '../../src/visual/creatures/v2/sea';
const g = buildSeaBoss('seaWitch')!;
g.updateMatrixWorld(true);
const hair = g.children.find((p) => p.name === 'coherent-swept-hair-cap') as THREE.Mesh;
const skin = g.children.find((p) => p.name.includes('skin')) as THREE.Mesh;
const probe = new THREE.Mesh(skin.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
probe.position.copy(skin.position);
probe.updateMatrixWorld();
const geo = hair.geometry.index ? hair.geometry.toNonIndexed() : hair.geometry,
  a = geo.getAttribute('position'),
  center = new THREE.Vector3(0, 2.62, 0.025);
let min = Infinity,
  count = 0;
for (let i = 0; i < a.count; i += 3) {
  const v = [0, 1, 2].map((j) => new THREE.Vector3().fromBufferAttribute(a, i + j).applyMatrix4(hair.matrixWorld));
  for (const p of [
    ...v,
    ...v.map((p, j) =>
      p
        .clone()
        .add(v[(j + 1) % 3])
        .multiplyScalar(0.5),
    ),
    v[0]
      .clone()
      .add(v[1])
      .add(v[2])
      .multiplyScalar(1 / 3),
  ]) {
    const d = p.clone().sub(center),
      r = d.length();
    const hit = new THREE.Raycaster(center, d.normalize()).intersectObject(probe, false)[0];
    if (hit) {
      count++;
      min = Math.min(min, r - hit.distance);
    }
  }
}
console.log({ samples: count, minimumClearance: min });
if (min < 0.001) throw Error('Cap triangle penetration');

mkdirSync('.art/sea-witch-scalp-fit', { recursive: true });
writeFileSync(
  '.art/sea-witch-scalp-fit/clearance.json',
  JSON.stringify(
    {
      samples: count,
      minimumClearance: min,
      requiredMinimum: 0.001,
      sampling: 'vertices, edge midpoints and triangle centroids; finite diagnostic, not exhaustive visual proof',
      sourceHeadSHA256: createHash('sha256')
        .update(readFileSync('src/visual/creatures/v2/sea-witch-authored-face.ts'))
        .digest('hex'),
      sourceCrownSHA256: createHash('sha256')
        .update(readFileSync('src/visual/creatures/v2/sea-witch-fitted-crown.ts'))
        .digest('hex'),
    },
    null,
    2,
  ),
);
