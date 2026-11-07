import * as THREE from 'three';
import { buildSchoolMonster } from '../../src/visual/creatures/v2/school';
const model = buildSchoolMonster('bookGhost', 0)!;
let checked = 0;
model.traverse((o) => {
  if (!(o instanceof THREE.Mesh) || !o.name.startsWith('seated-book-')) return;
  o.geometry.computeBoundingBox();
  const back = o.position.z + o.geometry.boundingBox!.max.z * o.scale.z;
  const targetFront = o.name.includes('corner') ? -0.0655 : -0.0665;
  const overlap = back - targetFront;
  if (overlap < 0.0009 || overlap > 0.002) throw new Error(`${o.name} incorrect mounting overlap:${overlap}`);
  console.log(o.name, overlap);
  checked++;
});
if (checked !== 10) throw new Error(`Expected10 actual rivets, found${checked}`);
console.log('PASS10 rivets overlap bracket/rail fronts between0.9–2mm; actual side pixels still required');
