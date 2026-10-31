import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PlayerModel, type PlayerPose } from '../../src/entities/PlayerModel';
import { REWARD_ITEMS } from '../../src/data/worlds';
import { createRewardModels } from '../../src/visual/RewardModels';

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
const out = process.argv[2] || '.art/hunter-poses';
mkdirSync(out, { recursive: true });
const inventory: object[] = [];
async function save(id: string, object: THREE.Object3D, poseEvidence?: object) {
  object.updateMatrixWorld(true);
  let triangles = 0,
    draws = 0;
  const bounds = new THREE.Box3();
  const point = new THREE.Vector3();
  object.traverseVisible((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    draws++;
    triangles += (node.geometry.index?.count ?? node.geometry.getAttribute('position').count) / 3;
    for (let i = 0; i < node.geometry.getAttribute('position').count; i++) {
      node.getVertexPosition(i, point).applyMatrix4(node.matrixWorld);
      bounds.expandByPoint(point);
    }
  });
  inventory.push({
    id,
    triangles,
    draws,
    min: bounds.min.toArray(),
    max: bounds.max.toArray(),
    poseEvidence,
    boundsMethod: 'exact-transformed-visible-vertices',
  });
  const data = await new GLTFExporter().parseAsync(object, { binary: true, onlyVisible: true });
  writeFileSync(`${out}/${id}.glb`, Buffer.from(data as ArrayBuffer));
}
const idle: PlayerPose = {
  running: false,
  airborne: false,
  sliding: false,
  lateralVelocity: 0,
  verticalVelocity: 0,
  dash: false,
  invulnerable: false,
  alive: true,
};
if (process.argv.includes('--validation-only')) {
  const run = { ...idle, running: true };
  const slide = { ...run, sliding: true };
  const samples: { id: string; steps: { dt: number; pose: PlayerPose }[] }[] = [
    { id: 'run-6', steps: [{ dt: Math.PI / 32, pose: run }] },
    { id: 'run-18', steps: [{ dt: (3 * Math.PI) / 32, pose: run }] },
    { id: 'dash-6', steps: [{ dt: Math.PI / 46, pose: { ...run, dash: true } }] },
    { id: 'jump-rise', steps: [{ dt: 0.16, pose: { ...idle, airborne: true, verticalVelocity: 3 } }] },
    { id: 'jump-apex', steps: [{ dt: 0.16, pose: { ...idle, airborne: true, verticalVelocity: 0 } }] },
    { id: 'jump-fall', steps: [{ dt: 0.16, pose: { ...idle, airborne: true, verticalVelocity: -3 } }] },
    {
      id: 'slide-entry',
      steps: [
        { dt: 0.1, pose: run },
        { dt: 0.016, pose: slide },
      ],
    },
    { id: 'slide', steps: [{ dt: 0.16, pose: slide }] },
    {
      id: 'slide-exit',
      steps: [
        { dt: 0.16, pose: slide },
        { dt: 0.016, pose: run },
      ],
    },
    {
      id: 'landing',
      steps: [
        { dt: 0.16, pose: { ...idle, airborne: true, verticalVelocity: -3 } },
        { dt: 0.016, pose: run },
      ],
    },
  ];
  for (const sample of samples) {
    const hunter = new PlayerModel();
    for (const step of sample.steps) hunter.update(step.dt, step.pose);
    await save(`hunter-qa-${sample.id}`, hunter.group, { qaPoseId: sample.id, steps: sample.steps });
  }
} else {
  for (const [id, pose] of Object.entries({
    run: { ...idle, running: true },
    jump: { ...idle, airborne: true, verticalVelocity: 3 },
    slide: { ...idle, sliding: true, running: true },
    dash: { ...idle, running: true, dash: true },
  })) {
    const hunter = new PlayerModel();
    hunter.update(0.16, pose);
    await save(`hunter-pose-${id}`, hunter.group, { steps: [{ dt: 0.16, pose }] });
  }
  const combined = new PlayerModel();
  combined.equipHat(0x22d3ee, 'coral');
  combined.equipCape(0x7f1d1d, 'vampire');
  await save('hunter-combined', combined.group);
  combined.update(0.16, { ...idle, sliding: true, running: true });
  await save('hunter-combined-slide', combined.group);
  await save('hunter', new PlayerModel().group);
  const rewards = createRewardModels();
  for (const [id, item] of Object.entries(REWARD_ITEMS)) {
    const hunter = new PlayerModel();
    if (item.slot === 'cape') hunter.equipCape(item.color, item.appearance);
    else hunter.equipHat(item.color, item.appearance);
    await save(`hunter-${id}`, hunter.group);
    const reward = item.slot === 'cape' ? rewards.capes[item.appearance] : rewards.hats[item.appearance];
    await save(`reward-${id}`, reward.group);
  }
}
writeFileSync(`${out}/inventory.json`, JSON.stringify(inventory, null, 2));
console.log(`Exported ${inventory.length} hunter assets and poses to ${out}`);
