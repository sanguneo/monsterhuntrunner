import * as THREE from 'three';
import { authoredSchoolFace as girl } from '../../src/visual/creatures/v2/generated/schoolGirlFace';
import { schoolGirlCrown as crown } from '../../src/visual/creatures/v2/generated/schoolGirlCrown';
const head = girl.find((p) => p.name === 'authored-school-face')!;
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(head.position, 3));
const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
mesh.updateMatrixWorld();
const center = new THREE.Vector3(0, 2.68, 0.015);
let minimum = Infinity,
  samples = 0;
for (let i = 0; i < crown.position.length; i += 9) {
  const v = [0, 3, 6].map(
    (j) => new THREE.Vector3(crown.position[i + j], crown.position[i + j + 1] - 0.06, crown.position[i + j + 2]),
  );
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
      distance = d.length(),
      hit = new THREE.Raycaster(center, d.normalize()).intersectObject(mesh, false)[0];
    if (!hit) throw new Error('Missing actual head beneath crown');
    minimum = Math.min(minimum, distance - hit.distance);
    samples++;
  }
}
if (minimum < 0.001) throw new Error(`Crown triangle interior intersects head: ${minimum}`);
console.log('PASS actual crown vertex/edge/centroid clearance', samples, minimum, 'meters');
