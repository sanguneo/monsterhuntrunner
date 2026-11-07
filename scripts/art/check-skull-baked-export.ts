import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { skullBakedMaps } from '../../src/visual/creatures/v2/skull-baked-surfaces';
import { disposeSurfaceDetailCache, surfaceDetailStats } from '../../src/visual/creatures/v2/SurfaceDetail';
const root = process.argv[2];
assert.ok(root, 'Pass the current validated GLB checkpoint directory explicitly');
for (const [id, lod] of [
  ['boneGolem', 'mob'],
  ['skeletonKnight', 'boss'],
] as const) {
  const bytes = readFileSync(`${root}/${id}.glb`),
    length = bytes.readUInt32LE(12),
    doc = JSON.parse(bytes.subarray(20, 20 + length).toString()),
    bin = bytes.subarray(28 + length);
  assert.ok(doc.images.length >= 3);
  const decoded: Buffer[] = [];
  for (const image of doc.images) {
    const v = doc.bufferViews[image.bufferView];
    const r = await sharp(bin.subarray(v.byteOffset, v.byteOffset + v.byteLength))
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.ok([128, 256].includes(r.info.width));
    assert.ok([128, 256].includes(r.info.height));
    assert.equal(r.info.channels, 4);
    decoded.push(r.data);
  }
  const maps = skullBakedMaps(lod);
  for (const [name, map] of Object.entries(maps))
    assert.ok(
      decoded.some((v) => v.equals(Buffer.from(map.image.data))),
      `${id}/${name} exact bytes`,
    );
  const mat = doc.materials.find((m: { name?: string }) => m.name === `authored-ivory-${lod}`);
  assert.ok(mat.normalTexture);
  assert.equal(mat.occlusionTexture.index, mat.pbrMetallicRoughness.metallicRoughnessTexture.index);
}
const stats = surfaceDetailStats();
assert.equal(stats.uniqueImages, 6);
assert.equal(stats.rawPixelBytes, 1572864);
assert.ok(stats.estimatedMipBytes <= stats.budgetBytes);
const old = skullBakedMaps('boss');
disposeSurfaceDetailCache();
assert.notEqual(skullBakedMaps('boss').color, old.color);
disposeSurfaceDetailCache();
writeFileSync(
  `${root}/skull-texture-validation.json`,
  JSON.stringify({ status: 'exact-pixel-and-lifecycle-pass', ...stats }, null, 2),
);
console.log('PASS both skull LOD PNG exact bytes, slots, cache ownership', stats);
