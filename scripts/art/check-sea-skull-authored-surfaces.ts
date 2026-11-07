import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildSeaMonster, buildSeaBoss } from '../../src/visual/creatures/v2/sea';
import { buildSkullMonster } from '../../src/visual/creatures/v2/skull';
let checked = 0;
for (const root of [buildSeaMonster('pufferfish', 0)!, buildSkullMonster('skullBird', 0)!, buildSeaBoss('seaWitch')!])
  root.traverse((o) => {
    if (
      !(o instanceof THREE.Mesh) ||
      ![
        'swept-puffer-fin',
        'puffer-fanned-tail',
        'rooted-curved-flight-vane',
        'wing-bone-covert',
        'fitted-tidal-bodice',
        'overlapping-aquatic-collar-fin',
        'layered-waist-fin',
        'flowing-fin-cuff',
      ].includes(o.name)
    )
      return;
    const p = o.geometry.getAttribute('position'),
      ix = o.geometry.index!,
      edges = new Map<string, { count: number; direction: number }>();
    let volume = 0;
    const key = (i: number) => [p.getX(i), p.getY(i), p.getZ(i)].map((v) => v.toFixed(6)).join(',');
    for (let i = 0; i < ix.count; i += 3) {
      const ids = [ix.getX(i), ix.getX(i + 1), ix.getX(i + 2)],
        v = ids.map((j) => new THREE.Vector3().fromBufferAttribute(p, j));
      volume += v[0].dot(v[1].clone().cross(v[2])) / 6;
      for (let n = 0; n < 3; n++) {
        const a = key(ids[n]),
          b = key(ids[(n + 1) % 3]);
        if (a === b) continue;
        const edge = a < b ? a + '|' + b : b + '|' + a,
          previous = edges.get(edge) || { count: 0, direction: 0 };
        previous.count++;
        previous.direction += a < b ? 1 : -1;
        edges.set(edge, previous);
      }
    }
    assert.ok(volume > 1e-8, `${o.name} outward volume ${volume}`);
    for (const e of edges.values()) {
      assert.equal(e.count, 2, `${o.name} manifold edge`);
      assert.equal(e.direction, 0, `${o.name} consistent winding`);
    }
    checked++;
  });
assert.equal(checked, 34);
console.log(
  'PASS 3 curved fins + 14 feather vanes + 6 bone coverts + 11 tailored membranes: closed manifold, consistent outward winding',
);
