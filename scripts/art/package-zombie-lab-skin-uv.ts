import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const root = resolve(process.argv[2] ?? '.art/zombie-lab-skin-uv');
const manifest = JSON.parse(readFileSync(resolve(root, 'skin-uv.manifest.json'), 'utf8'));
const records: Record<string, unknown> = {};
for (const [id, data] of Object.entries(manifest.assets) as [string, Record<string, string | number>][]) {
  const uv = readFileSync(resolve(root, data.uvFile as string)),
    tangent = readFileSync(resolve(root, data.tangentFile as string));
  for (const [bytes, expected] of [
    [uv, data.uvSha256],
    [tangent, data.tangentSha256],
  ] as const)
    if (createHash('sha256').update(bytes).digest('hex') !== expected)
      throw new Error(`${id}: atlas file SHA mismatch`);
  records[id] = {
    geometrySha256: data.geometrySha256,
    geometryFnv32: data.geometryFnv32,
    vertexCount: data.vertexCount,
    uvSha256: data.uvSha256,
    tangentSha256: data.tangentSha256,
    uvBase64: uv.toString('base64'),
    tangentBase64: tangent.toString('base64'),
  };
}
writeFileSync(resolve(root, 'skin-uv.runtime.json'), JSON.stringify(records));
console.log('PACKAGED_SHA_VERIFIED_ATLASES', Object.keys(records));
