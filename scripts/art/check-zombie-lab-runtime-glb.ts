import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import * as THREE from 'three';
import { buildZombieMonster, buildZombieBoss } from '../../src/visual/creatures/v2/zombie';
import { buildLabMonster, buildLabBoss } from '../../src/visual/creatures/v2/lab';
import { bakeStaticModel } from '../../src/visual/ModelKit';
const hash = (v: Uint8Array) => createHash('sha256').update(v).digest('hex');
const root = process.argv[2] ?? '.art/zombie-lab-runtime-v2';
const ids = process.argv[3]?.split(',') ?? [
  'zombie',
  'zombieDog',
  'crow',
  'giantZombie',
  'zombieKing',
  'wireGolem',
  'sparkBot',
  'drone',
  'lightningGolem',
  'frankenstein',
];
for (const id of ids) {
  const raw = readFileSync(`${root}/${id}.glb`),
    jsonLength = raw.readUInt32LE(12),
    doc = JSON.parse(raw.subarray(20, 20 + jsonLength).toString()),
    bin = raw.subarray(28 + jsonLength);
  const source = buildZombieMonster(id, 0) ?? buildZombieBoss(id) ?? buildLabMonster(id, 0) ?? buildLabBoss(id)!;
  const runtime = bakeStaticModel(source),
    expectedPositions: string[] = [],
    expectedImages = new Set<string>(),
    expectedMeshes = new Map<string, THREE.Mesh>();
  runtime.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const p = o.geometry.attributes.position.array;
    const key = hash(new Uint8Array(p.buffer, p.byteOffset, p.byteLength));
    expectedPositions.push(key);
    expectedMeshes.set(key, o);
    const m = o.material as THREE.MeshStandardMaterial;
    for (const t of [m.map, m.normalMap, m.roughnessMap, m.metalnessMap, m.aoMap])
      if (t) {
        const image = t.image;
        assert.ok(image.data instanceof Uint8Array);
        expectedImages.add(hash(image.data));
      }
  });
  const imageHashes: string[] = [];
  for (const image of doc.images ?? []) {
    const v = doc.bufferViews[image.bufferView];
    imageHashes.push(
      hash(
        await sharp(bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength))
          .ensureAlpha()
          .raw()
          .toBuffer(),
      ),
    );
  }
  const actualPositions: string[] = [];
  let maxNormalDifference = 0;
  const accessorBytes = (index: number) => {
    const a = doc.accessors[index],
      v = doc.bufferViews[a.bufferView],
      components = a.type === 'VEC2' ? 2 : a.type === 'VEC3' ? 3 : 4;
    assert.equal(a.componentType, 5126);
    assert.ok(!v.byteStride || v.byteStride === components * 4);
    const start = (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
    return bin.subarray(start, start + a.count * components * 4);
  };
  for (const mesh of doc.meshes)
    for (const primitive of mesh.primitives) {
      const a = doc.accessors[primitive.attributes.POSITION],
        view = doc.bufferViews[a.bufferView];
      assert.equal(a.componentType, 5126);
      assert.equal(a.type, 'VEC3');
      const start = (view.byteOffset ?? 0) + (a.byteOffset ?? 0);
      assert.ok(!view.byteStride || view.byteStride === 12);
      const key = hash(bin.subarray(start, start + a.count * 12));
      actualPositions.push(key);
      const expected = expectedMeshes.get(key);
      assert.ok(expected, `${id} runtime primitive correspondence`);
      for (const [semantic, attribute] of [
        ['NORMAL', 'normal'],
        ['TEXCOORD_0', 'uv'],
      ] as const) {
        const b = accessorBytes(primitive.attributes[semantic]),
          arr = expected.geometry.attributes[attribute].array;
        assert.equal(b.length, arr.byteLength);
        if (attribute === 'uv') assert.equal(hash(b), hash(new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)));
        else
          for (let i = 0; i < arr.length; i++)
            maxNormalDifference = Math.max(maxNormalDifference, Math.abs(b.readFloatLE(i * 4) - arr[i]));
      }
      if (expected.geometry.attributes.color) {
        const arr = expected.geometry.attributes.color.array;
        assert.equal(
          hash(accessorBytes(primitive.attributes.COLOR_0)),
          hash(new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)),
          `${id} exact authored vertex albedo`,
        );
      }
      const material = expected.material as THREE.MeshStandardMaterial,
        actual = doc.materials[primitive.material],
        pbr = actual.pbrMetallicRoughness ?? {};
      assert.ok(Math.abs((pbr.roughnessFactor ?? 1) - material.roughness) < 1e-6);
      assert.ok(Math.abs((pbr.metallicFactor ?? 1) - material.metalness) < 1e-6);
      const factor = pbr.baseColorFactor ?? [1, 1, 1, 1];
      for (let channel = 0; channel < 3; channel++)
        assert.ok(
          Math.abs(factor[channel] - material.color.toArray()[channel]) < 1e-6,
          `${id} linear base color factor`,
        );
      assert.ok(Math.abs(factor[3] - material.opacity) < 1e-6, `${id} opacity factor`);
      if (material instanceof THREE.MeshPhysicalMaterial) {
        const ext = actual.extensions ?? {};
        assert.ok(
          Math.abs((ext.KHR_materials_clearcoat?.clearcoatFactor ?? 0) - material.clearcoat) < 1e-6,
          `${id} physical clearcoat`,
        );
        if (material.clearcoat > 0)
          assert.ok(
            Math.abs((ext.KHR_materials_clearcoat?.clearcoatRoughnessFactor ?? 0) - material.clearcoatRoughness) < 1e-6,
            `${id} clearcoat roughness`,
          );
        assert.ok(
          Math.abs((ext.KHR_materials_transmission?.transmissionFactor ?? 0) - material.transmission) < 1e-6,
          `${id} physical transmission`,
        );
        if (material.transmission > 0)
          assert.ok(
            Math.abs((ext.KHR_materials_volume?.thicknessFactor ?? 0) - material.thickness) < 1e-6,
            `${id} physical thickness`,
          );
      }
      for (const [texture, slot] of [
        [material.map, pbr.baseColorTexture],
        [material.normalMap, actual.normalTexture],
        [material.roughnessMap, pbr.metallicRoughnessTexture],
        [material.aoMap, actual.occlusionTexture],
      ] as const) {
        if (!texture) {
          assert.ok(!slot);
          continue;
        }
        assert.ok(slot);
        assert.equal(imageHashes[doc.textures[slot.index].source], hash(texture.image.data));
      }
    }
  assert.deepEqual(actualPositions.sort(), expectedPositions.sort(), `${id} exact runtime POSITION buffers`);
  assert.ok(maxNormalDifference < 1e-6, `${id} authored normal preservation`);
  const actualImages = new Set(imageHashes);
  assert.deepEqual([...actualImages].sort(), [...expectedImages].sort(), `${id} lossless runtime PBR image bytes`);
  console.log('MATCH', id, {
    meshes: actualPositions.length,
    uniqueImageHashes: actualImages.size,
    maxNormalDifference,
  });
}
console.log(
  'PASS selected GLB positions/UV, normal tolerance, material factors/map slots and decoded PBR pixels match actual runtime factories',
);
