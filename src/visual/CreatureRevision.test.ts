import { loadAllCreatureWorlds } from './CreatureRegistry';
await loadAllCreatureWorlds();
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { WORLDS } from '../data/worlds';
import { createBossModel } from './BossModels';
import { createMonsterModel } from './MonsterModels';
import { buildSchoolBoss, buildSchoolMonster } from './creatures/v2/school';
import { schoolPencilShaftData } from './creatures/v2/schoolPencilGeometry';
import { prewarmCreatureModels } from './CreaturePreload';
import { surfaceDetailStats } from './creatures/v2/SurfaceDetail';

/** Runtime contracts only. These assertions deliberately do not certify appearance. */
describe('concept-first creature revision contracts', () => {
  it('mounts every book rivet into the actual metal bracket or rail, not in front of thin air', () => {
    const model = buildSchoolMonster('bookGhost', 0)!;
    model.updateMatrixWorld(true);
    let checked = 0;
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !object.name.startsWith('seated-book-')) return;
      const parent = object.parent!;
      const targets = parent.children.filter(
        (p) => p.name === 'brass-corner-clasp' || p.name === 'brass-book-mounting-rail',
      );
      const direction = new THREE.Vector3(0, 0, 1).transformDirection(parent.matrixWorld);
      const center = parent.localToWorld(object.position.clone());
      const ray = new THREE.Raycaster(center.clone().addScaledVector(direction, -5), direction);
      const hit = ray.intersectObjects(targets, false)[0];
      expect(hit, object.name + ' has actual supporting metal').toBeDefined();
      const local = parent.worldToLocal(hit.point.clone());
      object.geometry.computeBoundingBox();
      const back = object.position.z + object.geometry.boundingBox!.max.z * object.scale.z;
      const overlap = back - local.z;
      expect(overlap).toBeGreaterThan(0.0009);
      expect(overlap).toBeLessThan(0.002);
      checked++;
    });
    expect(checked).toBe(10);
  });

  it('ends the specter scalp above the eyes rather than cutting through the facial surface', () => {
    const model = buildSchoolBoss('ghostGirl')!;
    model.updateMatrixWorld(true);
    const cap = model.getObjectByName('continuous-hair-crown') as THREE.Mesh;
    expect(cap).toBeDefined();
    for (const x of [-0.065, -0.045, 0.045, 0.065]) {
      for (const y of [2.585, 2.6, 2.615]) {
        const ray = new THREE.Raycaster(new THREE.Vector3(x, y, -2), new THREE.Vector3(0, 0, 1));
        const hits = ray.intersectObject(cap, false);
        for (const hit of hits) expect(hit.point.z).toBeGreaterThan(-0.04);
      }
    }
  });

  it('buries every specter primary lock root inside the actual scalp shell', () => {
    const model = buildSchoolBoss('ghostGirl')!;
    model.updateMatrixWorld(true);
    const original = model.getObjectByName('continuous-hair-crown') as THREE.Mesh;
    const diagnosticMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const cap = new THREE.Mesh(original.geometry, diagnosticMaterial);
    cap.matrixAutoUpdate = false;
    cap.matrixWorld.copy(original.matrixWorld);
    const center = new THREE.Vector3(0, 2.72, 0.015);
    let checked = 0;
    for (const obj of model.children) {
      if (
        !(obj instanceof THREE.Mesh) ||
        !/^(continuous-hair-wall|sweeping-hair-layer|parted-(left|right)-fringe)/.test(obj.name)
      )
        continue;
      const count = obj.name.includes('fringe') ? 13 : 9;
      const positions = obj.geometry.getAttribute('position');
      for (let j = 0; j < count; j++) {
        const point = new THREE.Vector3().fromBufferAttribute(positions, j).applyMatrix4(obj.matrixWorld);
        const direction = point.clone().sub(center),
          distance = direction.length();
        const hit = new THREE.Raycaster(center, direction.normalize()).intersectObject(cap, false)[0];
        expect(hit, `${obj.name}:${j} intersects actual scalp`).toBeDefined();
        expect(hit.distance - distance, `${obj.name}:${j} buried root`).toBeGreaterThanOrEqual(0.0005);
        checked++;
      }
    }
    expect(checked).toBe(98);
    diagnosticMaterial.dispose();
  });

  it('keeps sculpted teacher hair on the authored silver-hair maps, not an unmapped fallback', () => {
    const model = buildSchoolBoss('ghostTeacher')!;
    for (const name of ['connected-hair-cap', 'swept-sculpted-hair-0', 'swept-sculpted-hair-1']) {
      const mesh = model.getObjectByName(name) as THREE.Mesh;
      expect(mesh).toBeDefined();
      const material = mesh.material as THREE.MeshStandardMaterial;
      expect(material.map).not.toBeNull();
      expect(material.normalMap).not.toBeNull();
      expect(material.roughnessMap).not.toBeNull();
    }
  });

  it('keeps carved pencil front-face winding outward after Boolean triangulation', () => {
    const p = schoolPencilShaftData.position;
    let checked = 0;
    for (let i = 0; i < p.length; i += 9) {
      const v = [0, 3, 6].map((j) => new THREE.Vector3(p[i + j], p[i + j + 1], p[i + j + 2]));
      const side = Math.sign(v[0].x);
      if (
        !side ||
        !v.every((q) => Math.sign(q.x) === side && Math.abs(q.z - (-0.12 + Math.abs(q.x) / Math.sqrt(3))) < 1e-5)
      )
        continue;
      if (Math.max(...v.map((q) => q.y)) - Math.min(...v.map((q) => q.y)) < 0.12) continue;
      // Exclude the intentional micron-wide bevel strips bordering this plane.
      if (Math.max(...v.map((q) => q.x)) - Math.min(...v.map((q) => q.x)) < 0.002) continue;
      const n = v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();
      expect(n.dot(new THREE.Vector3(side * 0.5, 0, -Math.sqrt(3) / 2))).toBeGreaterThan(0.999);
      checked++;
    }
    expect(checked).toBeGreaterThan(2);
  });

  it('routes all 30 documented identities through the new revision without a cute fallback', () => {
    const models = WORLDS.flatMap((world) => [
      ...world.monsters.map((def) => ({ id: def.id, model: createMonsterModel(def) })),
      ...[world.midBoss, world.finalBoss].map((def) => ({ id: def.id, model: createBossModel(def.id) })),
    ]);
    expect(models).toHaveLength(30);
    expect(new Set(models.map(({ id }) => id)).size).toBe(30);
    for (const { id, model } of models) {
      expect(model.name).toBe(id);
      expect(model.userData.identity).toBe(id);
      expect(model.userData.creatureRevision).toBe('concept-v2');
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        expect(object.material).toBeInstanceOf(THREE.MeshStandardMaterial);
        expect(object.castShadow).toBe(true);
        expect(object.receiveShadow).toBe(true);
        const positions = object.geometry.getAttribute('position');
        for (const attribute of Object.values(object.geometry.attributes) as THREE.BufferAttribute[]) {
          expect(attribute.count).toBe(positions.count);
          expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
        }
      });
    }
  });

  it('keeps all prewarmed creature texture sources inside the shared mip-inclusive GPU budget', async () => {
    await prewarmCreatureModels(async () => {});
    const stats = surfaceDetailStats();
    expect(stats.uniqueImages).toBeGreaterThan(0);
    expect(stats.estimatedMipBytes).toBeLessThanOrEqual(stats.budgetBytes);
  });

  it('prewarms every documented identity with a loader-paint yield between CPU builds', async () => {
    let yields = 0;
    await prewarmCreatureModels(async () => {
      yields++;
    });
    expect(yields).toBe(30);
    // A cached boss still gets separately owned mutable encounter resources.
    const first = createBossModel('giantZombie');
    const second = createBossModel('giantZombie');
    const a = first.children[0] as THREE.Mesh;
    const b = second.children[0] as THREE.Mesh;
    expect(a.geometry).not.toBe(b.geometry);
    expect(a.material).not.toBe(b.material);
    (a.material as THREE.Material).opacity = 0.1;
    expect((b.material as THREE.Material).opacity).toBe(1);
    a.geometry.dispose();
    expect(b.geometry.getAttribute('position').count).toBeGreaterThan(0);
  });

  it('keeps the descending-row skirt outward-facing without double-sided culling workarounds', () => {
    const group = buildSchoolBoss('ghostGirl')!;
    const skirt = group.getObjectByName('continuous-pleated-uniform-skirt') as THREE.Mesh;
    const positions = skirt.geometry.getAttribute('position');
    const normals = skirt.geometry.getAttribute('normal');
    let outward = 0;
    for (let i = 0; i < positions.count; i++) {
      outward += positions.getX(i) * normals.getX(i) + positions.getZ(i) * normals.getZ(i);
    }
    expect(outward / positions.count).toBeGreaterThan(0.1);
    expect((skirt.material as THREE.Material).side).toBe(THREE.FrontSide);
  });

  it('keeps every boss inside the unchanged material, triangle and world-space envelope', () => {
    for (const def of WORLDS.flatMap((world) => [world.midBoss, world.finalBoss])) {
      const model = createBossModel(def.id);
      let triangles = 0;
      let draws = 0;
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        draws++;
        triangles += (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3;
      });
      expect(triangles, `${def.id} triangle budget`).toBeLessThanOrEqual(20000);
      expect(draws, `${def.id} material batches`).toBeLessThanOrEqual(18);
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      expect(bounds.min.y, `${def.id} floor`).toBeGreaterThanOrEqual(-0.025);
      // Kraken is a low spreading octopus, not a humanoid; collision/attack data are unchanged.
      expect(size.y, `${def.id} minimum silhouette height`).toBeGreaterThanOrEqual(def.id === 'kraken' ? 2.1 : 2.5);
      expect(size.y, `${def.id} maximum silhouette height`).toBeLessThanOrEqual(def.id === 'kraken' ? 2.3 : 3.6);
      expect(size.x, `${def.id} lateral envelope`).toBeLessThanOrEqual(2.9);
      expect(size.z, `${def.id} depth envelope`).toBeLessThanOrEqual(2.2);
    }
  });
});
