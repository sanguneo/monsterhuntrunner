import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildZombieMonster, buildZombieBoss } from '../../src/visual/creatures/v2/zombie';
import { buildLabMonster, buildLabBoss } from '../../src/visual/creatures/v2/lab';
import { bakeStaticModel } from '../../src/visual/ModelKit';
const normal = ['zombie', 'zombieDog', 'crow', 'wireGolem', 'sparkBot', 'drone'];
const bosses = ['giantZombie', 'zombieKing', 'lightningGolem', 'frankenstein'];
const build = (id: string) =>
  buildZombieMonster(id, 0) || buildZombieBoss(id) || buildLabMonster(id, 0) || buildLabBoss(id);
for (const id of [...normal, ...bosses]) {
  const model = build(id)!;
  assert.ok(model, id);
  let meshes = 0;
  model.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    meshes++;
    const p = o.geometry.getAttribute('position');
    for (const [key, a] of Object.entries(o.geometry.attributes)) {
      assert.equal(a.count, p.count, id + ' ' + key);
      for (const v of a.array) assert.ok(Number.isFinite(v), id + ' finite ' + key);
    }
    if (o.name === 'single-continuous-torso-shoulders-arms') {
      const edges = new Map<string, number>(),
        index = o.geometry.index;
      const key = (i: number) => [p.getX(i), p.getY(i), p.getZ(i)].map((v) => Math.round(v * 1e5)).join(',');
      const count = index?.count ?? p.count;
      for (let t = 0; t < count; t += 3) {
        const ids = [0, 1, 2].map((n) => key(index ? index.getX(t + n) : t + n));
        for (let n = 0; n < 3; n++) {
          const a = ids[n],
            b = ids[(n + 1) % 3];
          if (a === b) continue;
          const e = [a, b].sort().join('|');
          edges.set(e, (edges.get(e) ?? 0) + 1);
        }
      }
      assert.equal([...edges.values()].filter((n) => n === 1).length, 0, id + ' continuous skin has no boundary edges');
    }
    assert.ok(!Array.isArray(o.material) && o.material instanceof THREE.MeshStandardMaterial, id + ' PBR');
  });
  assert.ok(meshes > 8, id + ' authored detail coverage');
  if (id === 'giantZombie') {
    model.updateMatrixWorld(true);
    let feet = Infinity,
      hands = Infinity;
    model.traverse((o) => {
      if (o.name === 'fitted-heavy-boot') feet = Math.min(feet, new THREE.Box3().setFromObject(o).min.y);
      if (o.name === 'powerful-curled-fist-hand') hands = Math.min(hands, new THREE.Box3().setFromObject(o).min.y);
    });
    assert.ok(Math.abs(feet - hands) < 0.005, 'giant fist/boot support-plane mismatch ' + Math.abs(feet - hands));
  }

  const b = bakeStaticModel(model);
  b.updateMatrixWorld(true);
  let triangles = 0,
    draws = 0;
  b.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      draws++;
      triangles += (o.geometry.index?.count ?? o.geometry.getAttribute('position').count) / 3;
    }
  });
  const box = new THREE.Box3().setFromObject(b),
    size = box.getSize(new THREE.Vector3()),
    boss = bosses.includes(id);
  assert.ok(triangles <= (boss ? 20000 : 6000), id + ' triangle budget ' + triangles);
  assert.ok(draws <= (boss ? 18 : 12), id + ' material budget ' + draws);
  assert.ok(boss ? box.min.y >= -0.025 : box.min.y > -0.7, id + ' lower bound');
  assert.ok(boss ? size.y >= 2.5 && size.y <= 3.6 : box.max.y < 0.8, id + ' height bound');
  if (boss) {
    assert.ok(size.x <= 2.9 && size.z <= 2.2, id + ' boss lateral bounds');
  }
  console.log(id, { triangles, draws, bounds: [box.min.toArray(), box.max.toArray()] });
}
assert.equal(build('not-a-creature'), undefined);
console.log(
  'PASS: all10 authored creatures, PBR, finite/equal attributes, exact batch/triangle/bounds contracts; pixel review still required',
);
