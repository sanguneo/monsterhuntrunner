import './export-texture-support';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mkdirSync, writeFileSync } from 'node:fs';
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
const out = '.art/world-review';
mkdirSync(out, { recursive: true });
const reports = [];
for (const world of WORLDS) {
  const scene = new THREE.Scene();
  const env = new Environment(scene);
  env.setTheme(world.theme);
  env.update(0);
  let triangles = 0,
    draws = 0;
  scene.traverseVisible((o) => {
    if (o instanceof THREE.Mesh) {
      triangles += (o.geometry.index?.count ?? o.geometry.getAttribute('position').count) / 3;
      draws++;
    }
  });
  reports.push({ id: world.id, triangles, draws, bg: world.theme.bg });
  console.log(world.id, triangles, draws);
  const data = await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: true });
  writeFileSync(`${out}/world-${world.id}.glb`, Buffer.from(data as ArrayBuffer));
}
writeFileSync(`${out}/inventory.json`, JSON.stringify(reports, null, 2));
