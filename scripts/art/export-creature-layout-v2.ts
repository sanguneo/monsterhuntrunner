import './preload-all-creature-themes';
import './export-texture-support';
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
import { Boss } from '../../src/entities/Boss';
import type { Game } from '../../src/core/Game';
import { CONFIG } from '../../src/data/config';
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
const out = process.argv[2] || '.art/creature-layout-v2';
const selectedWorld = process.argv[3];
mkdirSync(out, { recursive: true });
const reports = [];
for (const world of WORLDS.filter((w) => !selectedWorld || selectedWorld.split(',').includes(w.id))) {
  for (const encounter of [null, world.midBoss, world.finalBoss]) {
    const scene = new THREE.Scene();
    const env = new Environment(scene);
    env.setTheme(world.theme);
    env.update(0);
    const player = new Player();
    scene.add(player.group);
    const camera = new CameraController(480 / 600);
    camera.mode = encounter ? 'boss' : 'follow';
    camera.camera.name = 'exact-runtime-' + camera.mode + '-camera';
    scene.add(camera.camera);
    if (encounter) {
      // Real Boss intro reaches its normal arena height; no attack patterns are fabricated.
      const game = { scene } as Game;
      const boss = new Boss(encounter, game, CONFIG.world.arenaBossDistance);
      scene.add(boss.group);
      for (let frame = 0; frame < 90; frame++) boss.update(1 / 60);
      camera.reset(new THREE.Vector3(0, 0, 0), boss.position);
    } else {
      camera.reset(new THREE.Vector3(0, 0, 0), null);
      applyObstacleTheme(world.theme);
      for (const [type, lane, z] of [
        ['HIGH', 0, 10],
        ['LOW', 2, 10],
        ['BLOCK', 0, 28],
        ['PIT', 2, 22],
      ] as const)
        scene.add(new Obstacle(type, lane, z).mesh);
      for (const [i, def] of world.monsters.entries()) scene.add(new Monster(def, i, 16 + i * 3).mesh);
      for (const [i, type] of (['coin', 'gem', 'heal'] as const).entries())
        scene.add(new Pickup(type, 1, 6 + i * 3).mesh);
    }
    const reviewId = world.id + '-' + (encounter?.id ?? 'mobs');

    let triangles = 0,
      draws = 0;
    scene.traverseVisible((o) => {
      if (o instanceof THREE.Mesh) {
        triangles += (o.geometry.index?.count ?? o.geometry.getAttribute('position').count) / 3;
        draws++;
      }
    });
    reports.push({
      id: reviewId,
      world: world.id,
      encounter: encounter?.id ?? null,
      cameraMode: camera.mode,
      triangles,
      draws,
      bg: world.theme.bg,
      provenance:
        'Exact runtime factories, original scale, laneX spacing2; manually arranged review layout, not a captured gameplay frame',
    });
    console.log(reviewId, triangles, draws);
    const data = await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: true });
    writeFileSync(`${out}/world-${reviewId}.glb`, Buffer.from(data as ArrayBuffer));
  }
}
writeFileSync(`${out}/inventory.json`, JSON.stringify(reports, null, 2));
