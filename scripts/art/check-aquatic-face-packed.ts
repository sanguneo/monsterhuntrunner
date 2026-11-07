import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
// Compare current derived geometry to its own prepacking source, not the superseded row-built face.
// Historical original packing evidence remains in .art/sea-witch-face-authored/float32-packing-proof.json.
const fixture = process.argv[2] ?? '.art/sea-witch-cc0-integrated-v3/source-float32-reference.json';
const old = JSON.parse(readFileSync(fixture, 'utf8')) as {
  name: string;
  position: number[];
  normal: number[];
  uv: number[];
  color: number[];
}[];
import { authoredSeaWitchFace as packed } from '../../src/visual/creatures/v2/sea-witch-authored-face';
assert.equal(old.length, packed.length);
const proof = [];
for (let i = 0; i < old.length; i++) {
  assert.equal(old[i].name, packed[i].name);
  for (const key of ['position', 'normal', 'uv', 'color'] as const) {
    const a = new Float32Array(old[i][key]),
      b = packed[i][key];
    const aa = Buffer.from(a.buffer),
      bb = Buffer.from(b.buffer, b.byteOffset, b.byteLength);
    assert.deepEqual(bb, aa, old[i].name + ':' + key);
    proof.push({
      part: old[i].name,
      field: key,
      byteLength: aa.length,
      sha256: createHash('sha256').update(aa).digest('hex'),
    });
  }
}
writeFileSync(
  fixture.replace(/\.json$/, '-packing-proof.json'),
  JSON.stringify({ exact: true, fields: proof }, null, 2),
);
console.log('PASS current CC0-derived prepacking Float32 attribute bytes exactly preserved', proof.length);
