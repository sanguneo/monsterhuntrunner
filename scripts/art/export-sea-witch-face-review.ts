import './export-texture-support';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { buildSeaBoss } from '../../src/visual/creatures/v2/sea';
import { authoredSeaWitchFace } from '../../src/visual/creatures/v2/sea-witch-authored-face';
import { bakeStaticModel } from '../../src/visual/ModelKit';
const root = buildSeaBoss('seaWitch')!,
  head = new THREE.Group();
head.name = 'seaWitch-face';
for (const child of root.children) if (child.name.startsWith('aquatic-')) head.add(child.clone());
if (head.children.length !== authoredSeaWitchFace.length)
  throw Error('Missing aquatic face pieces ' + head.children.length);
const out = process.argv[2] ?? '.art/sea-witch-face-authored';
mkdirSync(out, { recursive: true });
const data = await new GLTFExporter().parseAsync(bakeStaticModel(head), { binary: true });
writeFileSync(`${out}/seaWitch-face.glb`, Buffer.from(data as ArrayBuffer));
