import * as THREE from 'three';
import { buildSchoolBoss } from '../../src/visual/creatures/v2/school';
const model = buildSchoolBoss('ghostGirl')!;
model.updateMatrixWorld(true);
const original = model.getObjectByName('continuous-hair-crown') as THREE.Mesh;
const cap = new THREE.Mesh(original.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
cap.matrixAutoUpdate = false;
cap.matrixWorld.copy(original.matrixWorld);
const center = new THREE.Vector3(0, 2.72, 0.015);
let checked = 0;
for (const obj of model.children) {
  if (
    !(obj instanceof THREE.Mesh) ||
    !/^(continuous-hair-wall|sweeping-hair-layer|parted-(left|right)-fringe)/.test(obj.name)
  )
    continue;
  const count = obj.name.includes('fringe') ? 13 : 9;
  const p = obj.geometry.getAttribute('position');
  for (let j = 0; j < count; j++) {
    const point = new THREE.Vector3().fromBufferAttribute(p, j).applyMatrix4(obj.matrixWorld);
    const d = point.clone().sub(center),
      distance = d.length();
    const hit = new THREE.Raycaster(center, d.normalize()).intersectObject(cap, false)[0];
    if (!hit || hit.distance < distance + 0.0005)
      throw new Error(
        `Unburied girl hair root ${obj.name}:${j} radial margin ${hit ? hit.distance - distance : 'no cap'} ${point.toArray()}`,
      );
    checked++;
  }
}
console.log(`PASS ${checked} girl hair-root boundary vertices inside actual scalp shell by >=0.5mm radial clearance`);
