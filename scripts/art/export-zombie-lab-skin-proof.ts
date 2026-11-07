import './export-texture-support';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { buildZombieBoss } from '../../src/visual/creatures/v2/zombie';
import { attachOfflineSkinUv, type OfflineSkinUv } from '../../src/visual/creatures/v2/zombieLabSkinUv';
import { registerSharedCreatureTexture, surfaceDetailStats } from '../../src/visual/creatures/v2/SurfaceDetail';
const root = resolve(process.argv[2] ?? '.art/zombie-lab-skin-bake-proof');
const manifest = JSON.parse(readFileSync(resolve(root, 'skin-uv.manifest.json'), 'utf8'));
const id = 'giantZombie',
  record = manifest.assets[id];
const uv = readFileSync(resolve(root, record.uvFile)),
  tangent = readFileSync(resolve(root, record.tangentFile));
const atlas: OfflineSkinUv = { ...record, uvBase64: uv.toString('base64'), tangentBase64: tangent.toString('base64') };
const model = buildZombieBoss(id)!;
const source = model.getObjectByName('single-continuous-torso-shoulders-arms') as THREE.Mesh;
const geometry = source.geometry.clone();
attachOfflineSkinUv(geometry, atlas);
const textures: Record<string, THREE.DataTexture> = {};
const imageStats: Record<string, unknown> = {};
for (const role of ['basecolor', 'normal', 'orm']) {
  const path = resolve(root, record.maps[role].file),
    png = readFileSync(path);
  assert.equal(createHash('sha256').update(png).digest('hex'), record.maps[role].sha256);
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 256);
  assert.equal(info.height, 256);
  const map = new THREE.DataTexture(new Uint8Array(data), info.width, info.height, THREE.RGBAFormat);
  map.name = id + '-diagnostic-' + role;
  map.colorSpace = role === 'basecolor' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  map.flipY = false;
  map.generateMipmaps = true;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.magFilter = THREE.LinearFilter;
  map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
  map.needsUpdate = true;
  registerSharedCreatureTexture(map);
  textures[role] = map;
  if (role === 'normal') {
    let maxError = 0;
    for (let i = 0; i < data.length; i += 4) {
      const len = Math.hypot(data[i] / 127.5 - 1, data[i + 1] / 127.5 - 1, data[i + 2] / 127.5 - 1);
      maxError = Math.max(maxError, Math.abs(len - 1));
    }
    assert.ok(maxError < 0.015, 'Invalid tangent normal pixels ' + maxError);
    imageStats.normalMaxUnitError = maxError;
  }
  imageStats[role] = {
    width: info.width,
    height: info.height,
    rgbaBytes: data.length,
    sha256: record.maps[role].sha256,
  };
}
const material = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  map: textures.basecolor,
  normalMap: textures.normal,
  aoMap: textures.orm,
  roughnessMap: textures.orm,
  metalnessMap: textures.orm,
  roughness: 1,
  metalness: 1,
});
material.name = 'DIAGNOSTIC-not-approved-final-skin';
const mesh = new THREE.Mesh(geometry, material);
mesh.name = 'giantZombie-SHA-stable-skin-atlas-proof';
const group = new THREE.Group();
group.name = mesh.name;
group.add(mesh);
const glb = Buffer.from((await new GLTFExporter().parseAsync(group, { binary: true })) as ArrayBuffer);
writeFileSync(resolve(root, 'giantZombie-skin-uv-proof.glb'), glb);
writeFileSync(
  resolve(root, 'skin-proof-validation.json'),
  JSON.stringify(
    {
      geometrySha256: record.geometrySha256,
      glbSha256: createHash('sha256').update(glb).digest('hex'),
      images: imageStats,
      sharedTextureStats: surfaceDetailStats(),
      status: 'pipeline diagnostic only, no final visual acceptance',
    },
    null,
    2,
  ),
);
console.log('EXPORTED_TEXTURED_SHA_STABLE_SKIN_PROOF', surfaceDetailStats());
