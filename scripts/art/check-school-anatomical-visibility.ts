import * as THREE from 'three';
import { authoredSchoolFace as parts } from '../../src/visual/creatures/v2/generated/schoolGirlFace';
function mesh(name: string) {
  const p = parts.find((p) => p.name === name)!;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p.position, 3));
  g.computeBoundingBox();
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  m.updateMatrixWorld();
  return m;
}
const skin = mesh('authored-school-face');
for (const side of ['l', 'r']) {
  const iris = mesh('school-iris-' + side),
    pupil = mesh('school-pupil-' + side),
    globe = mesh('authored-almond-sclera-' + side);
  for (const [part, under] of [
    [iris, globe],
    [pupil, iris],
  ]) {
    const p = part.geometry.getAttribute('position');
    let min = Infinity,
      n = 0,
      visible = 0;
    for (let i = 0; i < p.count; i += 3) {
      const v = [0, 1, 2].map((j) => new THREE.Vector3().fromBufferAttribute(p, i + j));
      for (const q of [
        ...v,
        ...v.map((a, j) =>
          a
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
        const ray = new THREE.Raycaster(new THREE.Vector3(q.x, q.y, -1), new THREE.Vector3(0, 0, 1));
        const hit = ray.intersectObject(under, false)[0];
        if (hit) {
          min = Math.min(min, hit.point.z - q.z);
          n++;
        }
        const sh = ray.intersectObject(skin, false)[0];
        if (!sh || sh.point.z > q.z) visible++;
      }
    }
    console.log(side, part === iris ? 'iris' : 'pupil', { min, n, visible, total: (p.count / 3) * 7 });
  }
}
