import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildSkullBoss, buildSkullMonster } from '../../src/visual/creatures/v2/skull';
const soldier = buildSkullMonster('skeletonSoldier', 0)!;
const spine = soldier.getObjectByName('continuous-articulated-spine-pelvis-to-occiput') as THREE.Mesh;
assert.ok(spine);
const sb = new THREE.Box3().setFromObject(spine);
assert.ok(sb.min.y < -0.055 && sb.max.y > 0.44, 'spine joins pelvis and skull roots');
assert.ok(!soldier.getObjectByName('central-spinal-column'), 'no detached backpack pole');
const king = buildSkullBoss('skullKing')!;
king.updateMatrixWorld(true);
const robe = king.getObjectByName('continuous-weighted-royal-robe') as THREE.Mesh;
const ray = new THREE.Raycaster();
let panels = 0,
  minClearance = Infinity;
for (const o of king.children) {
  if (!(o instanceof THREE.Mesh) || o.name !== 'surface-fitted-folded-royal-front-layer') continue;
  panels++;
  const p = o.geometry.getAttribute('position'),
    ix = o.geometry.index!;
  const edges = new Map<string, { count: number; direction: number }>();
  let volume = 0;
  const key = (i: number) => [p.getX(i), p.getY(i), p.getZ(i)].map((v) => v.toFixed(6)).join(',');
  for (let i = 0; i < ix.count; i += 3) {
    const ids = [ix.getX(i), ix.getX(i + 1), ix.getX(i + 2)];
    const v = ids.map((j) => new THREE.Vector3().fromBufferAttribute(p, j));
    volume += v[0].dot(v[1].clone().cross(v[2])) / 6;
    for (let j = 0; j < 3; j++) {
      const a = key(ids[j]),
        b = key(ids[(j + 1) % 3]);
      const k = a < b ? a + '|' + b : b + '|' + a;
      const e = edges.get(k) || { count: 0, direction: 0 };
      e.count++;
      e.direction += a < b ? 1 : -1;
      edges.set(k, e);
    }
    const c = v[0].clone().add(v[1]).add(v[2]).divideScalar(3);
    ray.set(new THREE.Vector3(c.x, c.y, -4), new THREE.Vector3(0, 0, 1));
    const hit = ray.intersectObject(robe, false)[0];
    assert.ok(hit, 'panel triangle stays within fitted robe');
    minClearance = Math.min(minClearance, hit.point.z - c.z);
  }
  assert.ok(volume > 0, 'cloth outward winding');
  for (const e of edges.values()) {
    assert.equal(e.count, 2);
    assert.equal(e.direction, 0);
  }
}
assert.equal(panels, 3);
assert.ok(minClearance > 0.003, 'cloth clearance at all triangle centroids: ' + minClearance);
console.log(
  'PASS connected soldier spine; three closed outward manifold fitted panels; minimum centroid clearance',
  minClearance,
);
// Every newly fitted armor piece is a real closed shell, not a double-sided decal.
let shells = 0;
for (const group of [king, buildSkullMonster('boneGolem', 0)!]) {
  group.updateMatrixWorld(true);
  for (const o of group.children) {
    if (
      !(o instanceof THREE.Mesh) ||
      ![
        'fitted-layered-scapular-bone-shell',
        'fitted-regal-breastplate',
        'raised-funerary-sternum-crest',
        'seated-breastplate-gilt-seam',
      ].includes(o.name)
    )
      continue;
    shells++;
    const p = o.geometry.getAttribute('position'),
      ix = o.geometry.index!;
    const edges = new Map<string, { count: number; direction: number }>();
    let volume = 0;
    const key = (i: number) => [p.getX(i), p.getY(i), p.getZ(i)].map((v) => v.toFixed(6)).join(',');
    for (let i = 0; i < ix.count; i += 3) {
      const ids = [ix.getX(i), ix.getX(i + 1), ix.getX(i + 2)],
        v = ids.map((j) => new THREE.Vector3().fromBufferAttribute(p, j));
      volume += v[0].dot(v[1].clone().cross(v[2])) / 6;
      for (let j = 0; j < 3; j++) {
        const a = key(ids[j]),
          b = key(ids[(j + 1) % 3]);
        assert.notEqual(a, b);
        const k = a < b ? a + '|' + b : b + '|' + a;
        const e = edges.get(k) || { count: 0, direction: 0 };
        e.count++;
        e.direction += a < b ? 1 : -1;
        edges.set(k, e);
      }
    }
    assert.ok(volume > 0, o.name + ' outward volume');
    for (const e of edges.values()) {
      assert.equal(e.count, 2, o.name + ' manifold');
      assert.equal(e.direction, 0, o.name + ' winding');
    }
    assert.equal((o.material as THREE.Material).side, THREE.FrontSide, o.name + ' true culling');
  }
}
assert.equal(shells, 6);
console.log('PASS six new fitted armor shells: closed manifold, outward winding, FrontSide culling');
