import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { buildZombieMonster, buildZombieBoss } from '../../src/visual/creatures/v2/zombie';
import { buildLabBoss } from '../../src/visual/creatures/v2/lab';
import { attachOfflineSkinUv, type OfflineSkinUv } from '../../src/visual/creatures/v2/zombieLabSkinUv';
const root = resolve(process.argv[2] ?? '.art/zombie-lab-skin-uv');
const records = JSON.parse(readFileSync(resolve(root, 'skin-uv.runtime.json'), 'utf8')) as Record<
  string,
  OfflineSkinUv
>;
for (const [id, atlas] of Object.entries(records)) {
  const model = buildZombieMonster(id, 0) ?? buildZombieBoss(id) ?? buildLabBoss(id);
  const mesh = model!.getObjectByName('single-continuous-torso-shoulders-arms') as THREE.Mesh;
  const g = mesh.geometry,
    p = g.getAttribute('position'),
    n = g.getAttribute('normal');
  const digest = () => {
    const hash = createHash('sha256');
    for (const a of [p, n]) hash.update(new Uint8Array(a.array.buffer, a.array.byteOffset, a.array.byteLength));
    return hash.digest('hex');
  };
  assert.equal(digest(), atlas.geometrySha256);
  attachOfflineSkinUv(g, atlas);
  assert.equal(digest(), atlas.geometrySha256, 'UV binding changed authored geometry');
  const uv = g.getAttribute('uv'),
    t = g.getAttribute('tangent');
  assert.equal(uv.count, p.count);
  assert.equal(t.count, p.count);
  for (let i = 0; i < p.count; i++) {
    const length = Math.hypot(t.getX(i), t.getY(i), t.getZ(i));
    assert.ok(Math.abs(length - 1) < 1e-4);
    assert.equal(Math.abs(t.getW(i)), 1);
    assert.ok(Math.abs(t.getX(i) * n.getX(i) + t.getY(i) * n.getY(i) + t.getZ(i) * n.getZ(i)) < 0.002);
  }
  let area = 0;
  for (let i = 0; i < p.count; i += 3) {
    const a =
      (uv.getX(i + 1) - uv.getX(i)) * (uv.getY(i + 2) - uv.getY(i)) -
      (uv.getY(i + 1) - uv.getY(i)) * (uv.getX(i + 2) - uv.getX(i));
    assert.ok(Math.abs(a) > 1e-14, `${id} collapsed UV triangle ${i / 3}`);
    area += Math.abs(a) * 0.5;
  }
  assert.ok(area > 0.1 && area < 1.001);
  const stale = g.clone();
  stale.attributes.position.setX(0, p.getX(0) + 0.01);
  assert.throws(() => attachOfflineSkinUv(stale, atlas), /Stale/);
  console.log('PASS', id, { vertices: p.count, coverage: area, geometrySha256: atlas.geometrySha256 });
}
