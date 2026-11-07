import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { authoredSchoolFace as girl } from '../../src/visual/creatures/v2/generated/schoolGirlFace';
import { authoredSchoolFace as teacher } from '../../src/visual/creatures/v2/generated/schoolTeacherFace';
for (const [identity, decoded] of [
  ['girl', girl],
  ['teacher', teacher],
] as const) {
  const source =
    identity === 'girl'
      ? '.art/school-anatomical-runtime-v1/float32-pack-input.json'
      : `.art/school-authored-faces/${identity}/float32-pack-input.json`;
  const original = JSON.parse(readFileSync(source, 'utf8'));
  if (original.length !== decoded.length) throw new Error('Part count mismatch');
  let bytes = 0;
  const hash = createHash('sha256');
  decoded.forEach((part, index) => {
    if (part.name !== original[index].name) throw new Error('Part ordering mismatch');
    for (const field of ['position', 'normal', 'uv', 'color'] as const) {
      const expected = new Float32Array(original[index][field]);
      const a = Buffer.from(expected.buffer),
        b = Buffer.from(part[field].buffer, part[field].byteOffset, part[field].byteLength);
      if (!a.equals(b)) throw new Error(`Lossy storage ${identity}/${part.name}/${field}`);
      bytes += b.length;
      hash.update(b);
    }
  });
  console.log('EXACT_FLOAT32_BYTES', identity, decoded.length, bytes, hash.digest('hex'));
}
