import './export-texture-support';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { ghoul, bat, werewolf } from '../../src/visual/creatures/v2/castleAdditional';
import { bakeStaticModel } from '../../src/visual/ModelKit';
class Reader {
  result: ArrayBuffer | string | null = null;
  onloadend?: () => void;
  readAsArrayBuffer(b: Blob) {
    b.arrayBuffer().then((x) => {
      this.result = x;
      this.onloadend?.();
    });
  }
  readAsDataURL(b: Blob) {
    b.arrayBuffer().then((x) => {
      this.result = 'data:application/octet-stream;base64,' + Buffer.from(x).toString('base64');
      this.onloadend?.();
    });
  }
}
Object.assign(globalThis, { FileReader: Reader });
const out = '.art/creature-v2/castle-additional';
mkdirSync(out, { recursive: true });
const inventory = [];
for (const id of ['ghoul', 'bat', 'werewolfChief']) {
  const model = bakeStaticModel(({ghoul,bat,werewolfChief:werewolf}[id as 'ghoul'|'bat'|'werewolfChief'])());
  let triangles = 0,
    draws = 0;
  model.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      triangles += (o.geometry.index?.count ?? o.geometry.getAttribute('position').count) / 3;
      draws++;
    }
  });
  const box = new THREE.Box3().setFromObject(model);
  inventory.push({ id, triangles, draws, min: box.min.toArray(), max: box.max.toArray() });
  writeFileSync(
    `${out}/${id}.glb`,
    Buffer.from((await new GLTFExporter().parseAsync(model, { binary: true })) as ArrayBuffer),
  );
}
writeFileSync(`${out}/inventory.json`, JSON.stringify(inventory, null, 2));
console.log(inventory);
