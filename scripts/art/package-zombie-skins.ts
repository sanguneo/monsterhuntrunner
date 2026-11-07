import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const root = process.argv[2] ?? '.art/zombie-fidelity-skin';
const atlases = JSON.parse(readFileSync(`${root}/skin-uv.runtime.json`, 'utf8'));
const manifest = JSON.parse(readFileSync(`${root}/skin-uv.manifest.json`, 'utf8')).assets;
for (const id of Object.keys(atlases)) {
  const maps: Record<string, unknown> = {};
  let size = 0;
  for (const kind of ['basecolor', 'normal', 'orm']) {
    const input = readFileSync(`${root}/${manifest[id].maps[kind].file}`);
    if (createHash('sha256').update(input).digest('hex') !== manifest[id].maps[kind].sha256)
      throw new Error('Stale skin bake');
    const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.width !== info.height || info.channels !== 4) throw new Error('Invalid skin bake shape');
    size = info.width;
    maps[kind] = { rgbaBase64: data.toString('base64'), sha256: createHash('sha256').update(data).digest('hex') };
  }
  writeFileSync(`${root}/${id}-skin.payload.json`, JSON.stringify({ atlas: atlases[id], size, maps }));
  console.log('PACKAGED_AUTHORED_SKIN', id, size);
}
