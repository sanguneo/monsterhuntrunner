import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildZombieMonster, buildZombieBoss } from '../../src/visual/creatures/v2/zombie';
for (const id of ['zombie', 'giantZombie', 'zombieKing']) {
  const root = buildZombieMonster(id, 0) ?? buildZombieBoss(id)!;
  const scalp = root.getObjectByName('continuous-cropped-hair-scalp') as THREE.Mesh;
  const skin = root.getObjectByName(`${id}-continuous-orbital-lid-nose-lip-quad-shell`) as THREE.Mesh;
  const pos = scalp.geometry.attributes.position,
    index = scalp.geometry.index!.array;
  let volume = 0;
  const edges = new Map<string, number>();
  for (let i = 0; i < index.length; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, index[i]),
      b = new THREE.Vector3().fromBufferAttribute(pos, index[i + 1]),
      c = new THREE.Vector3().fromBufferAttribute(pos, index[i + 2]);
    volume += a.dot(b.cross(c)) / 6;
    for (let j = 0; j < 3; j++) {
      const a = index[i + j],
        b = index[i + ((j + 1) % 3)],
        k = a < b ? `${a},${b}` : `${b},${a}`;
      edges.set(k, (edges.get(k) ?? 0) + 1);
    }
  }
  assert.ok(volume > 0, `${id} scalp outward winding`);
  assert.ok(
    [...edges.values()].every((n) => n === 2),
    `${id} closed shared scalp topology`,
  );
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const h = new THREE.Mesh(scalp.geometry, material),
    s = new THREE.Mesh(skin.geometry, material);
  h.updateMatrixWorld();
  s.updateMatrixWorld();
  const ray = new THREE.Raycaster(),
    direction = new THREE.Vector3(0, -1, 0);
  let min = Infinity,
    samples = 0;
  for (let ix = -8; ix <= 8; ix++)
    for (let iz = -6; iz <= 6; iz++) {
      ray.set(new THREE.Vector3(ix * 0.025, 3.5, iz * 0.025), direction);
      const hh = ray.intersectObject(h)[0],
        ss = ray.intersectObject(s)[0];
      if (!hh || !ss) continue;
      min = Math.min(min, hh.point.y - ss.point.y);
      samples++;
    }
  assert.ok(samples > 100);
  console.log(id, { samples, minimumScalpOverSkin: min });
  assert.ok(min >= 0.002, `${id} cranium protrudes through sampled scalp cap: ${min}`);
  material.dispose();
}
