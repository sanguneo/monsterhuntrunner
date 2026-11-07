import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildZombieMonster, buildZombieBoss } from '../../src/visual/creatures/v2/zombie';
import { buildLabMonster, buildLabBoss } from '../../src/visual/creatures/v2/lab';
import { buildFrankensteinFidelity } from '../../src/visual/creatures/v2/frankensteinFidelity';
import { applyZombieLabRuntimeMaterials } from '../../src/visual/creatures/v2/zombieLabRuntimeMaterials';
import { surfaceDetailStats, disposeSurfaceDetailCache } from '../../src/visual/creatures/v2/SurfaceDetail';
const ids = [
  'zombie',
  'zombieDog',
  'crow',
  'giantZombie',
  'zombieKing',
  'wireGolem',
  'sparkBot',
  'drone',
  'lightningGolem',
  'frankenstein',
];
const maps = new Set<THREE.Texture>();
let disposal = 0;
for (const id of ids) {
  const group =
    id === 'frankenstein'
      ? buildFrankensteinFidelity()
      : (buildZombieMonster(id, 0) ?? buildZombieBoss(id) ?? buildLabMonster(id, 0) ?? buildLabBoss(id)!);
  assert.ok(group);
  applyZombieLabRuntimeMaterials(group, id);
  let mapped = 0;
  const materials = new Set<THREE.Material>();
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const m = o.material as THREE.MeshStandardMaterial;
    materials.add(m);
    if (m.map) {
      mapped++;
      assert.equal(o.geometry.attributes.uv.count, o.geometry.attributes.position.count);
      for (const t of [m.map, m.normalMap, m.roughnessMap, m.metalnessMap, m.aoMap]) if (t) maps.add(t);
      assert.equal(m.roughnessMap, m.metalnessMap);
      assert.equal(m.aoMap, m.roughnessMap);
    }
  });
  assert.ok(mapped > 0, `${id} authored PBR maps missing`);
  for (const m of materials) m.dispose();
}
for (const t of maps) t.addEventListener('dispose', () => disposal++);
assert.equal(disposal, 0);
const stats = surfaceDetailStats();
assert.ok(stats.estimatedMipBytes < 10 * 1024 * 1024, 'Owned ten-creature texture envelope');
disposeSurfaceDetailCache();
assert.equal(disposal, maps.size);
console.log(
  'PASS all10 synchronous authored material/UV correspondence, shared image ownership, explicit teardown',
  stats,
);
