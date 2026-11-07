import './export-texture-support';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { surfaceDetailStats } from '../../src/visual/creatures/v2/SurfaceDetail';
import { buildLabMonster, buildLabBoss } from '../../src/visual/creatures/v2/lab';
import { bakeStaticModel } from '../../src/visual/ModelKit';
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
const out = process.argv[2] || '.art/lab-robots-fidelity-v1';
mkdirSync(out, { recursive: true });
const inventory = [];
for (const id of ['wireGolem', 'sparkBot', 'drone', 'lightningGolem']) {
  const authored = buildLabMonster(id, 0) ?? buildLabBoss(id)!;
  const o = bakeStaticModel(authored);
  o.name = id;
  o.updateMatrixWorld(true);
  let triangles = 0,
    draws = 0;
  o.traverse((n) => {
    if (n instanceof THREE.Mesh) {
      triangles += (n.geometry.index?.count ?? n.geometry.getAttribute('position').count) / 3;
      draws++;
    }
  });
  const b = new THREE.Box3().setFromObject(o);
  inventory.push({ id, triangles, draws, min: b.min.toArray(), max: b.max.toArray() });
  writeFileSync(
    `${out}/${id}.glb`,
    Buffer.from((await new GLTFExporter().parseAsync(o, { binary: true })) as ArrayBuffer),
  );
}
writeFileSync(`${out}/inventory.json`, JSON.stringify(inventory, null, 2));
console.log(inventory);

writeFileSync(`${out}/surface-stats.json`, JSON.stringify(surfaceDetailStats(), null, 2));
