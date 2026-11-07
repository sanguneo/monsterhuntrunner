import * as THREE from 'three';
import { buildSchoolBoss } from '../../src/visual/creatures/v2/school';
const model = buildSchoolBoss('ghostTeacher')!;
model.updateMatrixWorld(true);
const sourceCap = model.getObjectByName('connected-hair-cap') as THREE.Mesh;
const cap = new THREE.Mesh(sourceCap.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
cap.matrixAutoUpdate = false;
cap.matrixWorld.copy(sourceCap.matrixWorld);
let checked = 0;
for (let i = 0; i < 4; i++) {
  const lock = model.getObjectByName(`swept-sculpted-hair-${i}`) as THREE.Mesh;
  const p = lock.geometry.getAttribute('position');
  for (let j = 0; j < 9; j++) {
    const point = new THREE.Vector3().fromBufferAttribute(p, j).applyMatrix4(lock.matrixWorld);
    const hits = new THREE.Raycaster(point, new THREE.Vector3(0.831, 0.113, 0.544).normalize()).intersectObject(
      cap,
      false,
    );
    const unique = hits.filter((h, k) => k === 0 || h.distance - hits[k - 1].distance > 1e-6);
    if (unique.length % 2 !== 1) throw new Error(`Exposed teacher hair root ${i}:${j} ${point.toArray()}`);
    checked++;
  }
}
console.log(`PASS ${checked} teacher lock-root vertices enclosed inside actual scalp mesh`);
