import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Player } from '../../src/entities/Player';
import { Monster } from '../../src/entities/Monster';
import { Pickup } from '../../src/entities/Pickup';
import { Obstacle, applyObstacleTheme } from '../../src/entities/Obstacle';
import { CameraController } from '../../src/core/Camera';
import { Environment } from '../../src/core/Environment';
import { WORLDS } from '../../src/data/worlds';
class Reader {
  result: ArrayBuffer | string | null = null;
  onloadend?: () => void;
  readAsArrayBuffer(b: Blob) {
    b.arrayBuffer().then((a) => {
      this.result = a;
      this.onloadend?.();
    });
  }
  readAsDataURL(b: Blob) {
    b.arrayBuffer().then((a) => {
      this.result = 'data:application/octet-stream;base64,' + Buffer.from(a).toString('base64');
      this.onloadend?.();
    });
  }
}
Object.assign(globalThis, { FileReader: Reader });
const out = '.art/layout-review';
mkdirSync(out, { recursive: true });
const reports = [];
for (const world of WORLDS) {
  const scene = new THREE.Scene();
  const env = new Environment(scene);
  env.setTheme(world.theme);
  env.update(0);
  const player = new Player();
  scene.add(player.group);
  const camera = new CameraController(480 / 600);
  camera.mode = 'follow';
  camera.reset(new THREE.Vector3(0, 0, 0), null);
  camera.camera.name = 'exact-runtime-follow-camera';
  scene.add(camera.camera);
  applyObstacleTheme(world.theme);
  for (const [type, lane, z] of [
    ['HIGH', 0, 10],
    ['LOW', 2, 10],
    ['BLOCK', 0, 28],
    ['PIT', 2, 22],
  ] as const)
    scene.add(new Obstacle(type, lane, z).mesh);
  for (const [i, def] of world.monsters.entries()) scene.add(new Monster(def, i, 16 + i * 3).mesh);
  for (const [i, type] of (['coin', 'gem', 'heal'] as const).entries()) scene.add(new Pickup(type, 1, 6 + i * 3).mesh);

  let triangles = 0,
    draws = 0;
  scene.traverseVisible((o) => {
    if (o instanceof THREE.Mesh) {
      triangles += (o.geometry.index?.count ?? o.geometry.getAttribute('position').count) / 3;
      draws++;
    }
  });
  reports.push({
    id: world.id,
    triangles,
    draws,
    bg: world.theme.bg,
    provenance:
      'Exact runtime factories, original scale, laneX spacing2; manually arranged review layout, not a captured gameplay frame',
  });
  console.log(world.id, triangles, draws);
  const data = await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: true });
  writeFileSync(`${out}/world-${world.id}.glb`, Buffer.from(data as ArrayBuffer));
}
writeFileSync(`${out}/inventory.json`, JSON.stringify(reports, null, 2));
