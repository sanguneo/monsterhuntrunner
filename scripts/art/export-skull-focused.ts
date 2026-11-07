import './export-texture-support';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { skullBakeSourceGeometrySHA256 } from '../../src/visual/creatures/v2/skull-baked-surfaces';
import { buildSkullBoss, buildSkullMonster } from '../../src/visual/creatures/v2/skull';
import { bakeStaticModel } from '../../src/visual/ModelKit';

if (
  createHash('sha256').update(readFileSync('src/visual/creatures/v2/skull-authored-geometry.ts')).digest('hex') !==
  skullBakeSourceGeometrySHA256
)
  throw Error('Skull UV bake stale; rebake authored geometry');
const out = process.argv[2] || '.art/skull-focused-v1';
mkdirSync(out, { recursive: true });
const inventory = [];
for (const id of ['boneGolem', 'skeletonSoldier', 'skullBird', 'skeletonKnight', 'skullKing']) {
  const raw = buildSkullMonster(id, 0) || buildSkullBoss(id);
  if (!raw) throw Error(id);
  raw.updateMatrixWorld(true);
  let triangles = 0;
  raw.traverse((n) => {
    if (n instanceof THREE.Mesh) {
      const p = n.geometry.getAttribute('position');
      if (!Array.from(p.array).every(Number.isFinite)) throw Error(id + ': nonfinite position');
      for (const [name, a] of Object.entries(n.geometry.attributes))
        if (a.count !== p.count) throw Error(id + ':' + name + ' count');
      triangles += (n.geometry.index?.count ?? p.count) / 3;
    }
  });
  const group = bakeStaticModel(raw),
    bounds = new THREE.Box3().setFromObject(group);
  if (triangles > (['kraken', 'seaWitch', 'skeletonKnight', 'skullKing'].includes(id) ? 20000 : 6000))
    throw Error(id + ' exceeds triangles ' + triangles);
  if (group.children.length > (['kraken', 'seaWitch', 'skeletonKnight', 'skullKing'].includes(id) ? 18 : 12))
    throw Error(id + ' exceeds draws ' + group.children.length);
  const boss = ['kraken', 'seaWitch', 'skeletonKnight', 'skullKing'].includes(id),
    size = bounds.getSize(new THREE.Vector3());
  if (![...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite))
    throw Error(id + ': nonfinite bounds');
  if (
    boss
      ? bounds.min.y < -0.025 ||
        size.y < (id === 'kraken' ? 2.1 : 2.5) ||
        size.y > (id === 'kraken' ? 2.3 : 3.6) ||
        size.x > 2.9 ||
        size.z > 2.2
      : bounds.min.y <= -0.7 || bounds.max.y >= 0.8
  )
    throw Error(id + ': authored envelope');
  const row = { id, triangles, draws: group.children.length, min: bounds.min.toArray(), max: bounds.max.toArray() };
  inventory.push(row);
  console.log(row);
  const data = await new GLTFExporter().parseAsync(group, { binary: true });
  writeFileSync(`${out}/${id}.glb`, Buffer.from(data as ArrayBuffer));
}
writeFileSync(`${out}/inventory.json`, JSON.stringify(inventory, null, 2));
