import './preload-all-creature-themes';
import './export-texture-support';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createMonsterModel } from '../../src/visual/MonsterModels';
import { WORLDS } from '../../src/data/worlds';

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
for (const world of WORLDS) {
  for (const def of world.monsters) await save(def.id, createMonsterModel(def));
}
writeFileSync(`${out}/inventory.json`, JSON.stringify(inventory, null, 2));
console.log(`Exported ${inventory.length} monsters to ${out}`);
