import * as THREE from 'three';
import { writeFileSync } from 'node:fs';
import { buildZombieMonster, buildZombieBoss } from '../../src/visual/creatures/v2/zombie';
const targets: Record<string, { center: number[]; width: number }> = {};
for (const id of ['zombie', 'giantZombie', 'zombieKing']) {
  const root = buildZombieMonster(id, 0) ?? buildZombieBoss(id)!;
  root.updateMatrixWorld(true);
  const shell = root.getObjectByName(`${id}-continuous-orbital-lid-nose-lip-quad-shell`)!;
  if (!shell) throw new Error(`Missing actual face ${id}`);
  const box = new THREE.Box3().setFromObject(shell),
    c = box.getCenter(new THREE.Vector3()),
    size = box.getSize(new THREE.Vector3());
  targets[id] = { center: [c.x, -c.z, c.y], width: Math.max(size.x, size.y) * 1.35 };
}
writeFileSync(`${process.argv[2]}/face-targets.json`, JSON.stringify(targets, null, 2));
console.log(targets);
