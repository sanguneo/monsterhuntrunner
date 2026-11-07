import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { aquaticFaceMaps } from '../../src/visual/creatures/v2/sea-witch-face-surfaces';
import { disposeSurfaceDetailCache, surfaceDetailStats } from '../../src/visual/creatures/v2/SurfaceDetail';
const root = process.argv[2];
assert.ok(root, 'Pass exact isolated facial review directory');
const bytes = readFileSync(`${root}/seaWitch-face.glb`),
  length = bytes.readUInt32LE(12),
  doc = JSON.parse(bytes.subarray(20, 20 + length).toString()),
  bin = bytes.subarray(28 + length);
const index = doc.materials.findIndex((m: { name?: string }) => m.name === 'authored-aquatic-face-pigmentation');
assert.ok(index >= 0);
const material = doc.materials[index];
assert.ok(material.pbrMetallicRoughness.baseColorTexture);
assert.ok(material.pbrMetallicRoughness.metallicRoughnessTexture);
assert.equal(material.occlusionTexture.index, material.pbrMetallicRoughness.metallicRoughnessTexture.index);
for (const mesh of doc.meshes)
  for (const primitive of mesh.primitives)
    if (primitive.material === index)
      assert.ok(!('COLOR_0' in primitive.attributes), 'Baked vertex pigment must not be multiplied a second time');
const decoded: Buffer[] = [];
for (const image of doc.images) {
  const view = doc.bufferViews[image.bufferView];
  const result = await sharp(bin.subarray(view.byteOffset, view.byteOffset + view.byteLength))
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(result.info.width, 256);
  assert.equal(result.info.height, 256);
  assert.equal(result.info.channels, 4);
  decoded.push(result.data);
}
assert.equal(decoded.length, 2);
const maps = aquaticFaceMaps();
for (const [key, map] of Object.entries(maps))
  assert.ok(
    decoded.some((d) => d.equals(Buffer.from(map.image.data))),
    key + ' exact RGBA',
  );
const stats = surfaceDetailStats();
assert.equal(stats.uniqueImages, 2);
assert.equal(stats.rawPixelBytes, 524288);
disposeSurfaceDetailCache();
const next = aquaticFaceMaps();
assert.notEqual(next.color, maps.color);
assert.equal(surfaceDetailStats().uniqueImages, 2);
disposeSurfaceDetailCache();
writeFileSync(
  `${root}/facial-pigment-validation.json`,
  JSON.stringify({ status: 'exact-UV-image-material-lifecycle-pass', ...stats }, null, 2),
);
console.log('PASS authored facial color/ORM exact bytes, no double vertex tint, real slots/cache lifecycle', stats);
