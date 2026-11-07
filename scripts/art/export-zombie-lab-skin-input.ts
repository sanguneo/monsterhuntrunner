import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { buildZombieMonster, buildZombieBoss } from '../../src/visual/creatures/v2/zombie';
import { buildLabBoss } from '../../src/visual/creatures/v2/lab';
const root = resolve(process.argv[2] ?? '.art/zombie-lab-skin-uv');
mkdirSync(root, { recursive: true });
for (const id of ['zombie', 'giantZombie', 'zombieKing', 'frankenstein']) {
  const model = buildZombieMonster(id, 0) ?? buildZombieBoss(id) ?? buildLabBoss(id);
  if (!model) throw new Error(id);
  const skin = model.getObjectByName('single-continuous-torso-shoulders-arms') as THREE.Mesh;
  if (!skin?.geometry || skin.geometry.index) throw new Error(`${id}: expected named nonindexed authored skin`);
  const p = skin.geometry.getAttribute('position'),
    n = skin.geometry.getAttribute('normal');
  if (p.count !== n.count || p.count % 3) throw new Error(`${id}: invalid source attributes`);
  const bytes = new Uint8Array(p.array.buffer, p.array.byteOffset, p.array.byteLength);
  const normalBytes = new Uint8Array(n.array.buffer, n.array.byteOffset, n.array.byteLength);
  const sha = createHash('sha256').update(bytes).update(normalBytes).digest('hex');
  let fnv = 0x811c9dc5;
  for (const byte of bytes) fnv = Math.imul(fnv ^ byte, 0x01000193) >>> 0;
  for (const byte of normalBytes) fnv = Math.imul(fnv ^ byte, 0x01000193) >>> 0;
  writeFileSync(
    resolve(root, `${id}.geometry.json`),
    JSON.stringify({
      id,
      schema: 1,
      meshName: skin.name,
      geometrySha256: sha,
      geometryFnv32: fnv,
      vertexCount: p.count,
      triangles: p.count / 3,
      positions: Array.from(p.array),
      normals: Array.from(n.array),
      coordinateSystem: 'Three.js Y-up, forward -Z; source-local, before runtime fitting',
    }),
  );
  console.log(id, p.count, sha);
  const materials = new Set<THREE.Material>();
  model.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => materials.add(m));
    }
  });
  materials.forEach((m) => m.dispose());
}
