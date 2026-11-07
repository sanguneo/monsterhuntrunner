import * as THREE from 'three';
import { authoredSchoolFace as parts } from '../../src/visual/creatures/v2/generated/schoolGirlFace';
const skin = parts.find((p) => p.name === 'authored-school-face')!;
const sg = new THREE.BufferGeometry();
sg.setAttribute('position', new THREE.Float32BufferAttribute(skin.position, 3));
const sm = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
sm.updateMatrixWorld();
for (const side of ['l', 'r']) {
  const globe = parts.find((p) => p.name === `authored-almond-sclera-${side}`)!;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(globe.position, 3));
  geo.computeBoundingBox();
  const box = geo.boundingBox!,
    center = box.getCenter(new THREE.Vector3());
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  mesh.updateMatrixWorld();
  let minimum = Infinity,
    count = 0;
  const worst = new THREE.Vector3();
  for (let i = 0; i < skin.position.length; i += 9) {
    const v = [0, 3, 6].map(
      (j) => new THREE.Vector3(skin.position[i + j], skin.position[i + j + 1], skin.position[i + j + 2]),
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
      if (p.x < box.min.x || p.x > box.max.x || p.y < box.min.y || p.y > box.max.y || p.z > center.z) continue;
      const hit = new THREE.Raycaster(new THREE.Vector3(p.x, p.y, -1), new THREE.Vector3(0, 0, 1)).intersectObject(
        mesh,
        false,
      )[0];
      const sh = new THREE.Raycaster(new THREE.Vector3(p.x, p.y, -1), new THREE.Vector3(0, 0, 1)).intersectObject(
        sm,
        false,
      )[0];
      if (sh && Math.abs(sh.point.z - p.z) > 0.00005) continue;
      if (hit) {
        if (hit.point.z - p.z < minimum) worst.copy(p);
        minimum = Math.min(minimum, hit.point.z - p.z);
        count++;
      }
    }
  }
  console.log(side, box, center, 'skin versus actual globe', count, minimum, worst);
}
