import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const root = process.argv[2] ?? '.art/frankenstein-fidelity-skin';
const atlas = JSON.parse(readFileSync(`${root}/skin-uv.runtime.json`, 'utf8')).frankenstein;
const manifest = JSON.parse(readFileSync(`${root}/skin-uv.manifest.json`, 'utf8')).assets.frankenstein;
const maps: Record<string, unknown> = {};
let size = 0;
for (const kind of ['basecolor', 'normal', 'orm']) {
  const input = readFileSync(`${root}/${manifest.maps[kind].file}`);
  if (createHash('sha256').update(input).digest('hex') !== manifest.maps[kind].sha256)
    throw new Error('Stale skin bake');
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== info.height || info.channels !== 4) throw new Error('Invalid skin bake shape');
  size = info.width;
  maps[kind] = { rgbaBase64: data.toString('base64'), sha256: createHash('sha256').update(data).digest('hex') };
}
writeFileSync(`${root}/frankenstein-skin.payload.json`, JSON.stringify({ atlas, size, maps }));
console.log('PACKAGED_AUTHORED_SKIN', size, 'RGBA bytes', size * size * 4 * 3);
