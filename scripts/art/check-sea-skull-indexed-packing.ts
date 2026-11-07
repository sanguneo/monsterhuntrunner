import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { createAuthoredKrakenGeometry as oldK } from '../../.art/sea-skull-storage-baseline/kraken-authored-geometry';
import { createAuthoredSkullGeometry as oldS } from '../../.art/sea-skull-storage-baseline/skull-authored-geometry';
import { createAuthoredBirdSkull as oldB } from '../../.art/sea-skull-storage-baseline/skull-bird-authored-geometry';
import { createAuthoredKrakenGeometry as newK } from '../../src/visual/creatures/v2/kraken-authored-geometry';
import { createAuthoredSkullGeometry as newS } from '../../src/visual/creatures/v2/skull-authored-geometry';
import { createAuthoredBirdSkull as newB } from '../../src/visual/creatures/v2/skull-bird-authored-geometry';
const cases: [string, THREE.BufferGeometry[], THREE.BufferGeometry[]][] = [
  ['kraken', [oldK()], [newK()]],
  ['mobSkull', oldS('mob'), newS('mob')],
  ['bossSkull', oldS('boss'), newS('boss')],
  ['bird', oldB(), newB()],
];
const proof = [];
for (const [name, aa, bb] of cases) {
  assert.equal(aa.length, bb.length);
  for (let i = 0; i < aa.length; i++)
    for (const field of ['position', 'normal', 'uv', 'index']) {
      const a = (field === 'index' ? aa[i].index! : aa[i].getAttribute(field)).array,
        b = (field === 'index' ? bb[i].index! : bb[i].getAttribute(field)).array;
      assert.equal(a.constructor, b.constructor);
      const ab = Buffer.from(a.buffer, a.byteOffset, a.byteLength),
        bc = Buffer.from(b.buffer, b.byteOffset, b.byteLength);
      assert.deepEqual(bc, ab, name + ':' + field);
      proof.push({ name, part: i, field, bytes: ab.length, sha256: createHash('sha256').update(ab).digest('hex') });
    }
}
const modules = ['kraken-authored-geometry', 'skull-authored-geometry', 'skull-bird-authored-geometry'].map((name) => ({
  name,
  oldSHA: createHash('sha256')
    .update(readFileSync(`.art/sea-skull-storage-baseline/${name}.ts`))
    .digest('hex'),
  newSHA: createHash('sha256')
    .update(readFileSync(`src/visual/creatures/v2/${name}.ts`))
    .digest('hex'),
}));
writeFileSync(
  '.art/sea-skull-storage-baseline/indexed-packing-proof.json',
  JSON.stringify({ exact: true, modules, fields: proof }, null, 2),
);
console.log('PASS exact Float32/Uint16 buffers', proof.length);
