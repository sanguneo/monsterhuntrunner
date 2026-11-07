import './export-texture-support';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { createSurfaceMaterial, surfaceDetailStats } from '../../src/visual/creatures/v2/SurfaceDetail';
const group = new THREE.Group();
const material = createSurfaceMaterial('brocade', { color: 0x302338, normalStrength: 0.6 });
assert.equal(material.roughnessMap, material.metalnessMap);
group.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 4, 4), material));
const raw = await new GLTFExporter().parseAsync(group, { binary: true, onlyVisible: true });
const glb = Buffer.from(raw as ArrayBuffer);
assert.equal(glb.readUInt32LE(0), 0x46546c67);
const jsonLength = glb.readUInt32LE(12);
const doc = JSON.parse(glb.subarray(20, 20 + jsonLength).toString());
const binary = glb.subarray(28 + jsonLength);
assert.equal(doc.images.length, 3, 'one color, normal and packed ORM PNG, without redundant channel images');
const originals = [material.map!, material.normalMap!, material.roughnessMap!].map((map) => map.image.data);
const decoded: Uint8Array[] = [];
for (const image of doc.images) {
  assert.equal(image.mimeType, 'image/png');
  const view = doc.bufferViews[image.bufferView];
  const result = await sharp(binary.subarray(view.byteOffset, view.byteOffset + view.byteLength))
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(result.info.width, 128);
  assert.equal(result.info.height, 128);
  assert.equal(result.info.channels, 4);
  decoded.push(result.data);
}
for (const source of originals)
  assert.ok(
    decoded.some((pixels) => Buffer.from(pixels).equals(Buffer.from(source))),
    'exact RGBA bytes survived PNG/GLB export',
  );
assert.ok(doc.materials[0].normalTexture);
assert.ok(doc.materials[0].pbrMetallicRoughness.metallicRoughnessTexture);
assert.ok(doc.materials[0].occlusionTexture);
mkdirSync('.art/texture-pipeline', { recursive: true });
writeFileSync('.art/texture-pipeline/brocade-test.glb', glb);
writeFileSync(
  '.art/texture-pipeline/report.json',
  JSON.stringify(
    { status: 'exact-pixel-export-pass', images: doc.images.length, bytes: glb.length, ...surfaceDetailStats() },
    null,
    2,
  ),
);
console.log(
  'PASS exact runtime PBR RGBA bytes embedded in 3 lossless PNGs, correct GLB map slots',
  surfaceDetailStats(),
);
