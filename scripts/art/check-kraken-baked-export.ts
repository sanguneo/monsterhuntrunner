import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { krakenBakedMaps } from '../../src/visual/creatures/v2/kraken-baked-surfaces';
import { disposeSurfaceDetailCache, surfaceDetailStats } from '../../src/visual/creatures/v2/SurfaceDetail';
const root = process.argv[2];
assert.ok(root, 'Pass the current validated GLB checkpoint directory explicitly');
const bytes = readFileSync(`${root}/kraken.glb`),
  length = bytes.readUInt32LE(12);
const doc = JSON.parse(bytes.subarray(20, 20 + length).toString()),
  bin = bytes.subarray(28 + length);
assert.equal(doc.images.length, 3, 'only authored color, tangent normal and shared ORM');
const decoded: Buffer[] = [];
for (const image of doc.images) {
  assert.equal(image.mimeType, 'image/png');
  const v = doc.bufferViews[image.bufferView];
  const result = await sharp(bin.subarray(v.byteOffset, v.byteOffset + v.byteLength))
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(result.info.width, 256);
  assert.equal(result.info.height, 256);
  assert.equal(result.info.channels, 4);
  decoded.push(result.data);
}
const maps = krakenBakedMaps();
for (const [name, map] of Object.entries(maps))
  assert.ok(
    decoded.some((v) => v.equals(Buffer.from(map.image.data))),
    `${name} exact RGBA preservation`,
  );
const mat = doc.materials.find((m: { name?: string }) => m.name === 'authored-wet-purple-kraken');
assert.ok(mat?.normalTexture);
assert.ok(mat.occlusionTexture);
assert.equal(mat.occlusionTexture.index, mat.pbrMetallicRoughness.metallicRoughnessTexture.index);
const stats = surfaceDetailStats();
assert.equal(stats.uniqueImages, 3);
assert.ok(stats.estimatedMipBytes <= stats.budgetBytes);
assert.equal(stats.rawPixelBytes, 786432);
disposeSurfaceDetailCache();
const recreated = krakenBakedMaps();
assert.notEqual(recreated.color, maps.color);
assert.equal(surfaceDetailStats().uniqueImages, 3);
disposeSurfaceDetailCache();
writeFileSync(
  `${root}/baked-texture-validation.json`,
  JSON.stringify({ status: 'exact-pixel-and-cache-lifecycle-pass', images: 3, ...stats }, null, 2),
);
console.log(
  'PASS actual kraken 256 color/normal/ORM exact PNG bytes, map slots, shared lifecycle and texture budget',
  stats,
);
