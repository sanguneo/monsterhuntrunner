import './export-texture-support';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { buildSkullBoss, buildSkullMonster } from '../../src/visual/creatures/v2/skull';
import { bakeStaticModel } from '../../src/visual/ModelKit';

const out = '.art/skull-authored';
mkdirSync(out, { recursive: true });
for (const id of ['boneGolem', 'skeletonKnight']) {
  const source = buildSkullMonster(id, 0) || buildSkullBoss(id);
  if (!source) throw Error(id);
  const head = new THREE.Group();
  head.name = id + '-anatomy';
  for (const child of source.children)
    if (
      [
        'sculpted-skull-with-recessed-orbits',
        'actual-concave-orbital-nasal-oral-surfaces',
        'recessed-orbital-wisp',
      ].includes(child.name)
    )
      head.add(child.clone());
  const data = await new GLTFExporter().parseAsync(bakeStaticModel(head), { binary: true });
  writeFileSync(`${out}/${head.name}.glb`, Buffer.from(data as ArrayBuffer));
}
