import './preload-all-creature-themes';
import './export-texture-support';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createMonsterModel } from '../../src/visual/MonsterModels';
import { createBossModel } from '../../src/visual/BossModels';
import { PlayerModel } from '../../src/entities/PlayerModel';
import { Environment } from '../../src/core/Environment';
import { WORLDS, REWARD_ITEMS } from '../../src/data/worlds';
import { createRewardModels } from '../../src/visual/RewardModels';
import { createHazardModel } from '../../src/visual/HazardModels';
import { Pickup } from '../../src/entities/Pickup';
import { Projectile } from '../../src/entities/Projectile';
import { Effects } from '../../src/core/Effects';
import { createAttackWall, createWaveGeometry, createTelegraphGeometry } from '../../src/visual/AttackModels';

class Reader {
  result: ArrayBuffer | string | null = null;
  onloadend?: () => void;
  readAsArrayBuffer(blob: Blob) {
    blob.arrayBuffer().then((b) => {
      this.result = b;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob: Blob) {
    blob.arrayBuffer().then((b) => {
      this.result = 'data:application/octet-stream;base64,' + Buffer.from(b).toString('base64');
      this.onloadend?.();
    });
  }
}
Object.assign(globalThis, { FileReader: Reader });
const out = process.argv[2] || '.art/current';
mkdirSync(out, { recursive: true });
const inventory: object[] = [];
async function save(id: string, object: THREE.Object3D) {
  const meshes: THREE.Mesh[] = [];
  object.traverseVisible((o) => {
    if (o instanceof THREE.Mesh) meshes.push(o);
  });
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  inventory.push({
    id,
    triangles: meshes.reduce(
      (n, m) => n + (m.geometry.index?.count ?? m.geometry.getAttribute('position').count) / 3,
      0,
    ),
    draws: meshes.length,
    min: bounds.min.toArray(),
    max: bounds.max.toArray(),
  });
  const data = await new GLTFExporter().parseAsync(object, { binary: true, onlyVisible: true });
  writeFileSync(`${out}/${id}.glb`, Buffer.from(data as ArrayBuffer));
}
await save('hunter', new PlayerModel().group);
const rewards = createRewardModels();
for (const [id, item] of Object.entries(REWARD_ITEMS)) {
  const hunter = new PlayerModel();
  if (item.slot === 'cape') hunter.equipCape(item.color, item.appearance);
  else hunter.equipHat(item.color, item.appearance);
  await save(`hunter-${id}`, hunter.group);
  const model = item.slot === 'cape' ? rewards.capes[item.appearance] : rewards.hats[item.appearance];
  model.group.visible = true;
  await save(`reward-${id}`, model.group);
}
for (const type of ['coin', 'gem', 'heal'] as const) await save(`pickup-${type}`, new Pickup(type, 1, 0, 0).mesh);
for (const shape of ['ball', 'rod', 'shard'] as const)
  await save(
    `projectile-${shape}`,
    new Projectile('enemy', 1, new THREE.Vector3(), new THREE.Vector3(), false, 2, { shape }).mesh,
  );
await save('projectile-player', new Projectile('player', 1, new THREE.Vector3(), new THREE.Vector3()).mesh);
for (const id of ['ghostGirl', 'zombieKing', 'kraken', 'dracula', 'skeletonKnight'])
  await save(`attack-wall-${id}`, createAttackWall(id, 0x8e6bb6));
await save(
  'attack-wave',
  new THREE.Mesh(
    createWaveGeometry(7.5),
    new THREE.MeshStandardMaterial({
      color: 0x8adce2,
      roughness: 0.24,
      metalness: 0.08,
      emissive: 0x8adce2,
      emissiveIntensity: 0.12,
      transparent: true,
      opacity: 0.85,
    }),
  ),
);
await save(
  'attack-telegraph',
  new THREE.Mesh(createTelegraphGeometry(), new THREE.MeshBasicMaterial({ color: 0xffaa77 })),
);
for (const kind of ['collect', 'heal', 'hit', 'defeat', 'blast', 'land', 'dash'] as const) {
  const scene = new THREE.Scene(),
    effects = new Effects(scene);
  effects.emit(kind, new THREE.Vector3());
  effects.update(0.08);
  await save(`fx-${kind}`, effects.group);
}
for (const [worldIndex, world] of WORLDS.entries()) {
  for (const type of ['LOW', 'HIGH', 'PIT', 'BLOCK'] as const)
    await save(`hazard-${world.id}-${type.toLowerCase()}`, createHazardModel(type, worldIndex));
  for (const def of world.monsters) await save(def.id, createMonsterModel(def));
  for (const def of [world.midBoss, world.finalBoss]) await save(def.id, createBossModel(def.id));
  const scene = new THREE.Scene();
  const env = new Environment(scene);
  env.setTheme(world.theme);
  env.update(0);
  // The first active recycled module is the complete stage authoring unit.
  const chunk = scene.children.find((o) => o instanceof THREE.Group)!;
  // Export a reusable module at its local origin; full layout exports retain game placement.
  const module = chunk.clone(true);
  module.position.set(0, 0, 0);
  await save(`world-${world.id}`, module);
}
writeFileSync(`${out}/inventory.json`, JSON.stringify(inventory, null, 2));
console.log(`Exported ${inventory.length} assets to ${out}`);
