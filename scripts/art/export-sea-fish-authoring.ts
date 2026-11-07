import './export-texture-support';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { buildSeaMonster } from '../../src/visual/creatures/v2/sea';
const dir = '.art/sea-fish-authored';
if (existsSync(`${dir}/fish-anatomy-manifest.json`))
  throw Error(
    'Original inputs already preserved. Edit original Blender source; never recapture evaluated cavity output as original.',
  );
mkdirSync(dir, { recursive: true });
for (const [id, name] of [
  ['sharkFin', 'shark-continuous-hydrodynamic-body'],
  ['pufferfish', 'armored-inflated-puffer-body'],
]) {
  const root = buildSeaMonster(id, 0)!;
  const source = root.getObjectByName(name) as THREE.Mesh;
  if (!source) throw Error(name);
  const mesh = new THREE.Mesh(source.geometry.clone(), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  mesh.name = id;
  const result = await new GLTFExporter().parseAsync(mesh, { binary: true });
  writeFileSync(`${dir}/${id}-body-input.glb`, Buffer.from(result as ArrayBuffer));
}
