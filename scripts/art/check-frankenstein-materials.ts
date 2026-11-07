import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { buildFrankensteinFidelity } from '../../src/visual/creatures/v2/frankensteinFidelity';
import { applyBakedSkin, type BakedSkinPayload } from '../../src/visual/creatures/v2/zombieLabBakedSkin';
import { applyFrankensteinGarmentMaterials } from '../../src/visual/creatures/v2/zombieLabFidelityMaterials';
import { surfaceDetailStats, disposeSurfaceDetailCache } from '../../src/visual/creatures/v2/SurfaceDetail';
const payload = JSON.parse(
  readFileSync('.art/frankenstein-fidelity-skin/frankenstein-skin.payload.json', 'utf8'),
) as BakedSkinPayload;
const models = [buildFrankensteinFidelity(), buildFrankensteinFidelity()];
const materials = models.map((m) => {
  applyFrankensteinGarmentMaterials(m);
  const skin = m.getObjectByName('single-continuous-torso-shoulders-arms') as THREE.Mesh;
  applyBakedSkin(skin, payload);
  return skin.material as THREE.MeshStandardMaterial;
});
assert.notEqual(materials[0], materials[1]);
assert.equal(materials[0].map, materials[1].map);
assert.equal(materials[0].roughnessMap, materials[0].aoMap);
assert.equal(materials[0].roughnessMap, materials[0].metalnessMap);
let disposed = 0;
materials[0].map!.addEventListener('dispose', () => disposed++);
materials[0].dispose();
assert.equal(disposed, 0);
assert.ok(materials[1].map!.image);
let maxError = 0;
const bytes = Uint8Array.from(atob(payload.maps.normal.rgbaBase64), (c) => c.charCodeAt(0));
for (let i = 0; i < bytes.length; i += 4)
  maxError = Math.max(
    maxError,
    Math.abs(Math.hypot((bytes[i] / 255) * 2 - 1, (bytes[i + 1] / 255) * 2 - 1, (bytes[i + 2] / 255) * 2 - 1) - 1),
  );
assert.ok(maxError < 0.01);
const stats = surfaceDetailStats();
// Four shared 128² RGB/normal/ORM role sets plus one unique 256² skin set.
assert.equal(stats.estimatedMipBytes, 12 * Math.ceil((128 * 128 * 4 * 4) / 3) + 3 * Math.ceil((256 * 256 * 4 * 4) / 3));
disposeSurfaceDetailCache();
assert.equal(disposed, 1);
// Cache must rebuild live textures after explicit global teardown, not retain disposed maps.
const next = buildFrankensteinFidelity(),
  skin = next.getObjectByName('single-continuous-torso-shoulders-arms') as THREE.Mesh;
applyBakedSkin(skin, payload);
assert.notEqual((skin.material as THREE.MeshStandardMaterial).map, materials[1].map);
console.log('PASS anatomical maps, paired material ownership, teardown/rebuild', {
  maxNormalUnitError: maxError,
  ...stats,
});
