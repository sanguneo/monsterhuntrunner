import './export-texture-support';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildSchoolMonster, buildSchoolBoss } from '../../src/visual/creatures/v2/school';
import { bakeStaticModel } from '../../src/visual/ModelKit';
class Reader {
  result: ArrayBuffer | string | null = null;
  onloadend?: () => void;
  readAsArrayBuffer(b: Blob) {
    b.arrayBuffer().then((v) => {
      this.result = v;
      this.onloadend?.();
    });
  }
  readAsDataURL(b: Blob) {
    b.arrayBuffer().then((v) => {
      this.result = 'data:application/octet-stream;base64,' + Buffer.from(v).toString('base64');
      this.onloadend?.();
    });
  }
}
Object.assign(globalThis, { FileReader: Reader });
const out = process.argv[2] || '.art/creature-v2/school';
mkdirSync(out, { recursive: true });
const report: object[] = [];
for (const id of ['bookGhost', 'pencilGhost', 'paperGhost', 'ghostTeacher', 'ghostGirl']) {
  const source = buildSchoolMonster(id, 0) || buildSchoolBoss(id);
  if (!source) continue;
  const metadata = source.userData;
  const g = bakeStaticModel(source);
  g.userData = metadata;
  let triangles = 0,
    draws = 0;
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      draws++;
      triangles += (o.geometry.index?.count ?? o.geometry.getAttribute('position').count) / 3;
    }
  });
  const box = new THREE.Box3().setFromObject(g);
  report.push({ id, triangles, draws, min: box.min.toArray(), max: box.max.toArray() });
  const data = await new GLTFExporter().parseAsync(g, { binary: true, onlyVisible: true });
  writeFileSync(`${out}/${id}.glb`, Buffer.from(data as ArrayBuffer));
}
writeFileSync(`${out}/inventory.json`, JSON.stringify(report, null, 2));
console.log(report);
