import * as THREE from 'three';
import { buildSchoolBoss } from '../../src/visual/creatures/v2/school';
const model = buildSchoolBoss('ghostTeacher')!;
let checked = 0;
model.traverse((o) => {
  if (!(o instanceof THREE.Mesh) || !/layered-spectral-cloth|flowing-coat-tail/.test(o.name)) return;
  const p = o.geometry.getAttribute('position'),
    index = o.geometry.index;
  const vertex = (i: number) => new THREE.Vector3().fromBufferAttribute(p, index ? index.getX(i) : i);
  let volume = 0;
  const edges = new Map<string, { count: number; balance: number }>();
  const key = (p: THREE.Vector3) =>
    p
      .toArray()
      .map((v) => v.toFixed(7))
      .join(',');
  for (let i = 0; i < (index?.count ?? p.count); i += 3) {
    const a = vertex(i),
      b = vertex(i + 1),
      c = vertex(i + 2);
    volume += a.dot(b.clone().cross(c)) / 6;
    const keys = [key(a), key(b), key(c)];
    for (let q = 0; q < 3; q++) {
      const u = keys[q],
        v = keys[(q + 1) % 3];
      if (u === v) continue;
      const k = [u, v].sort().join('|'),
        e = edges.get(k) ?? { count: 0, balance: 0 };
      e.count++;
      e.balance += u < v ? 1 : -1;
      edges.set(k, e);
    }
  }
  if ([...edges.values()].some((e) => e.count !== 2 || e.balance !== 0))
    throw new Error(`Open/inconsistent cloth topology ${o.name}`);
  if (!(volume > 1e-7)) throw new Error(`Inward or collapsed cloth ${o.name}: ${volume}`);
  console.log('OUTWARD_CLOSED_CLOTH', o.name, volume);
  checked++;
});
if (checked !== 5) throw new Error(`Expected5 authored cloth sheets, found${checked}`);
