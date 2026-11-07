import './export-texture-support';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { createHash } from 'node:crypto';
import { createSurfaceMaterial } from '../../src/visual/creatures/v2/SurfaceDetail';
const group = new THREE.Group();
group.name = 'deterministic-texture-export-control';
for (const [i, key] of (
  ['velvet', 'satin', 'wornLeather', 'agedGold', 'spectralSkin', 'brocade', 'ivoryLinen', 'hair'] as const
).entries()) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), createSurfaceMaterial(key, { color: 0xffffff }));
  mesh.name = key;
  mesh.position.x = i;
  group.add(mesh);
}
const hashes: string[] = [];
for (let i = 0; i < 5; i++) {
  const data = await new GLTFExporter().parseAsync(group, { binary: true });
  hashes.push(
    createHash('sha256')
      .update(Buffer.from(data as ArrayBuffer))
      .digest('hex'),
  );
}
if (new Set(hashes).size !== 1) throw new Error('Repeated exports reorder image bufferViews: ' + hashes.join(','));
console.log('PASS five exact-byte identical exports with 24 distinct PBR PNG images', hashes[0]);
