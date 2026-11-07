import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildZombieMonster, buildZombieBoss } from '../../src/visual/creatures/v2/zombie';
for (const id of ['zombie', 'giantZombie', 'zombieKing']) {
  const root = buildZombieMonster(id, 0) ?? buildZombieBoss(id)!;
  const body = root.getObjectByName('single-continuous-torso-shoulders-arms') as THREE.Mesh;
  if (id === 'zombieKing')
    root.traverse((o) => {
      if (o.name === 'powerful-curled-fist-hand' || o.name === 'continuous-broad-fold-royal-mantle')
        assert.equal(
          o.parent,
          body.parent,
          'King hands and mantle must follow the exact same upper-body charging transform as their supports',
        );
    });
  const p = body.geometry.attributes.position,
    grid = new Map<string, THREE.Triangle[]>(),
    cell = 0.18;
  for (let i = 0; i < p.count; i += 3) {
    const t = new THREE.Triangle(
      ...([0, 1, 2].map((j) => new THREE.Vector3().fromBufferAttribute(p, i + j)) as [
        THREE.Vector3,
        THREE.Vector3,
        THREE.Vector3,
      ]),
    );
    const box = new THREE.Box3().setFromPoints([t.a, t.b, t.c]);
    for (let x = Math.floor(box.min.x / cell); x <= Math.floor(box.max.x / cell); x++)
      for (let y = Math.floor(box.min.y / cell); y <= Math.floor(box.max.y / cell); y++)
        for (let z = Math.floor(box.min.z / cell); z <= Math.floor(box.max.z / cell); z++) {
          const key = `${x},${y},${z}`;
          grid.set(key, [...(grid.get(key) ?? []), t]);
        }
  }
  for (const name of [
    'wraparound-ragged-vest-with-real-armholes',
    'fitted-layered-dark-undershirt',
    'frayed-shoulder-underlayer',
  ]) {
    if (id === 'zombieKing' && name === 'frayed-shoulder-underlayer') continue;
    const coat = root.getObjectByName(name) as THREE.Mesh;
    assert.ok(coat, `${id} ${name}`);
    const c = coat.geometry.attributes.position,
      ix = coat.geometry.index!.array;
    let min = Infinity,
      samples = 0;
    const nearest = new THREE.Vector3(),
      normal = new THREE.Vector3();
    function check(q: THREE.Vector3) {
      let best = Infinity,
        signed = 0;
      const x = Math.floor(q.x / cell),
        y = Math.floor(q.y / cell),
        z = Math.floor(q.z / cell),
        seen = new Set<THREE.Triangle>();
      for (let a = -1; a <= 1; a++)
        for (let b = -1; b <= 1; b++)
          for (let d = -1; d <= 1; d++)
            for (const t of grid.get(`${x + a},${y + b},${z + d}`) ?? []) {
              if (seen.has(t)) continue;
              seen.add(t);
              t.closestPointToPoint(q, nearest);
              const distance = q.distanceTo(nearest);
              if (distance < best) {
                best = distance;
                t.getNormal(normal);
                signed = q.clone().sub(nearest).dot(normal) >= 0 ? distance : -distance;
              }
            }
      assert.ok(Number.isFinite(best));
      min = Math.min(min, signed);
      samples++;
    }
    for (let i = 0; i < c.count; i++) check(new THREE.Vector3().fromBufferAttribute(c, i));
    for (let i = 0; i < ix.length; i += 3) {
      const q = new THREE.Vector3();
      for (let j = 0; j < 3; j++) q.add(new THREE.Vector3().fromBufferAttribute(c, ix[i + j]));
      check(q.multiplyScalar(1 / 3));
    }
    console.log(id, name, { samples, minSignedLocalClearance: min });
    assert.ok(min >= 0.005, `${id} ${name} penetrates or lacks 5mm sampled inner clearance: ${min}`);
  }
}
console.log(
  'PASS sampled garment vertices and triangle centers remain outside body; not exhaustive animated collision certification',
);
