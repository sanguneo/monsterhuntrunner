import './preload-all-creature-themes';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBossModel } from '../../src/visual/BossModels';
import { WORLDS } from '../../src/data/worlds';

for (const def of WORLDS.flatMap((w) => [w.midBoss, w.finalBoss])) {
  const body = createBossModel(def.id);
  let triangles = 0,
    draws = 0;
  body.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    draws++;
    const p = o.geometry.getAttribute('position'),
      n = o.geometry.getAttribute('normal');
    assert(p && n, `${def.id}: missing geometry attributes`);
    assert([...p.array, ...n.array].every(Number.isFinite), `${def.id}: nonfinite geometry`);
    triangles += (o.geometry.index?.count ?? p.count) / 3;
    assert(o.castShadow && o.receiveShadow, `${def.id}: missing shadow flags`);
  });
  assert(triangles <= 20000, `${def.id}: ${triangles} triangles exceeds 20K character spec`);
  assert(draws <= 18, `${def.id}: ${draws} material batches`);
  const box = new THREE.Box3().setFromObject(body),
    size = box.getSize(new THREE.Vector3());
  assert(box.min.y >= -0.025, `${def.id}: feet below authored pivot`);
  // Same authored Kraken-only low-sprawl envelope as CreatureRevision.test.ts.
  const minHeight = def.id === 'kraken' ? 2.1 : 2.5;
  const maxHeight = def.id === 'kraken' ? 2.3 : 3.6;
  assert(size.y >= minHeight && size.y <= maxHeight, `${def.id}: unexpected height ${size.y}`);
  assert(size.x <= 2.9 && size.z <= 2.2, `${def.id}: unexpected gameplay footprint`);
  console.log(
    `${def.id}: ${triangles} triangles, ${draws} batches, finite geometry, ${size
      .toArray()
      .map((v) => v.toFixed(2))
      .join(' × ')}`,
  );
}
assert.throws(() => createBossModel('missing-id'), /Unknown creature identity/);
