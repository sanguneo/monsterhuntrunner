import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PlayerModel, HUNTER_ROAD_CONTACT_Y } from './PlayerModel';
import { REWARD_ITEMS } from '../data/worlds';

function report(root: THREE.Object3D): { triangles: number; draws: number } {
  let triangles = 0,
    draws = 0;
  root.traverseVisible((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    draws++;
    const geometry = node.geometry as THREE.BufferGeometry;
    const position = geometry.getAttribute('position');
    triangles += (geometry.index?.count ?? position.count) / 3;
    for (const attribute of Object.values(geometry.attributes)) {
      expect(attribute.count, `${node.name}: every vertex attribute matches POSITION count`).toBe(position.count);
      expect(Array.from(attribute.array).every(Number.isFinite), `${node.name}: finite geometry`).toBe(true);
    }
    const normals = geometry.getAttribute('normal');
    let maxNormalError = 0;
    for (let i = 0; i < normals.count; i++) {
      const length = Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i));
      maxNormalError = Math.max(maxNormalError, Math.abs(length - 1));
    }
    expect(maxNormalError, `${node.name}: all authored normals unit`).toBeLessThan(1e-4);
    expect(node.castShadow, node.name).toBe(true);
  });
  return { triangles, draws };
}

describe('sculpted hunter asset contract', () => {
  it('uses one continuous colored head/muzzle and one shell per boot and ear', () => {
    const hunter = new PlayerModel();
    const head = hunter.group.getObjectByName('continuous-head-and-muzzle') as THREE.Mesh;
    expect(head).toBeInstanceOf(THREE.Mesh);
    expect(head.geometry.getAttribute('color')).toBeDefined();
    const count = (name: string) => {
      let n = 0;
      hunter.group.traverse((node) => {
        if (node.name === name) n++;
      });
      return n;
    };
    expect(count('continuous-head-and-muzzle')).toBe(1);
    expect(count('single-tailored-boot-shell')).toBe(2);
    expect(count('continuous-ear-with-inset-color')).toBe(2);
    expect(count('continuous-forearm-and-hand')).toBe(2);
    const budget = report(hunter.group);
    expect(budget.triangles).toBeLessThanOrEqual(20000);
    expect(budget.draws).toBeLessThanOrEqual(50);
  });

  it('attaches front-facing face patches to actual head triangles with bounded inset at closed rims', () => {
    const hunter = new PlayerModel();
    hunter.group.updateMatrixWorld(true);
    const head = hunter.group.getObjectByName('hunter-head-pivot')!;
    const inverse = head.matrixWorld.clone().invert();
    const authoredHead = hunter.group.getObjectByName('continuous-head-and-muzzle') as THREE.Mesh;
    const probeMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const probe = new THREE.Mesh(authoredHead.geometry, probeMaterial);
    const ray = new THREE.Raycaster();
    const records: object[] = [];
    for (const name of ['hunter-eye--1', 'hunter-eye-1', 'conforming-rabbit-nose']) {
      const feature = hunter.group.getObjectByName(name)!;
      expect(feature).toBeDefined();
      let samples = 0,
        misses = 0,
        minClearance = Infinity,
        maxClearance = -Infinity,
        minFrontFacingClearance = Infinity,
        frontFacingSamples = 0;
      const frontFacingByMaterial: Record<string, number> = {};
      feature.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        const p = node.geometry.getAttribute('position'),
          n = node.geometry.getAttribute('normal');
        const matrix = inverse.clone().multiply(node.matrixWorld),
          normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
        for (let i = 0; i < p.count; i++) {
          const point = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(matrix);
          ray.set(new THREE.Vector3(point.x, point.y, 1), new THREE.Vector3(0, 0, -1));
          const hit = ray.intersectObject(probe, false)[0];
          if (!hit) {
            misses++;
            continue;
          }
          samples++;
          const clearance = point.z - hit.point.z;
          minClearance = Math.min(minClearance, clearance);
          maxClearance = Math.max(maxClearance, clearance);
          const normal = new THREE.Vector3(n.getX(i), n.getY(i), n.getZ(i)).applyMatrix3(normalMatrix).normalize();
          if (normal.z > 0.4) {
            frontFacingSamples++;
            minFrontFacingClearance = Math.min(minFrontFacingClearance, clearance);
            const key = (node.material as THREE.MeshStandardMaterial).color.getHexString();
            frontFacingByMaterial[key] = (frontFacingByMaterial[key] ?? 0) + 1;
          }
        }
      });
      records.push({
        name,
        samples,
        misses,
        minClearance,
        maxClearance,
        frontFacingSamples,
        minFrontFacingClearance,
        frontFacingByMaterial,
      });
      expect(misses, `${name}: no silently skipped domain samples`).toBe(0);
      expect(samples).toBeGreaterThan(30);
      expect(frontFacingSamples).toBeGreaterThan(10);
      expect(minClearance, `${name}: only closed back/rim may inset`).toBeGreaterThan(-0.02);
      expect(maxClearance, `${name}: no detached facial plates`).toBeLessThan(0.04);
      expect(minFrontFacingClearance, `${name}: front patch must not be buried`).toBeGreaterThan(0.0001);
      if (name.startsWith('hunter-eye'))
        for (const color of ['ffefd9', '8e552f'])
          expect(frontFacingByMaterial[color], `${name}: front-facing sclera/iris samples`).toBeGreaterThan(10);
    }
    probeMaterial.dispose();
    console.log(
      'HUNTER_FACE_REPORT',
      JSON.stringify({
        method: 'raycast actual authored head triangles',
        thresholds: { rimInsetMin: -0.02, clearanceMax: 0.04, frontFacingClearanceMin: 0.0001 },
        records,
        pixelReview: 'required; attachment does not establish relaxed expression',
      }),
    );
  });

  it('keeps reset and idle soles on the authored road without moving the collision root', () => {
    const hunter = new PlayerModel();
    const minimumSole = () => {
      hunter.group.updateMatrixWorld(true);
      let y = Infinity;
      hunter.group.traverse((node) => {
        if (!(node instanceof THREE.Mesh) || node.name !== 'single-tailored-boot-shell') return;
        const p = node.geometry.getAttribute('position');
        for (let i = 0; i < p.count; i++)
          y = Math.min(y, new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(node.matrixWorld).y);
      });
      return y;
    };
    expect(Math.abs(minimumSole() - HUNTER_ROAD_CONTACT_Y)).toBeLessThan(1e-4);
    for (let frame = 0; frame < 120; frame++) {
      hunter.update(1 / 60, {
        running: false,
        airborne: false,
        sliding: false,
        dash: false,
        alive: true,
        invulnerable: false,
        lateralVelocity: Math.sin(frame / 15) * 4,
        verticalVelocity: 0,
      });
      expect(Math.abs(minimumSole() - HUNTER_ROAD_CONTACT_Y)).toBeLessThan(1e-4);
      expect(hunter.group.position.toArray()).toEqual([0, 0, 0]);
    }
    hunter.update(0.16, {
      running: false,
      airborne: true,
      sliding: false,
      dash: false,
      alive: true,
      invulnerable: false,
      lateralVelocity: 0,
      verticalVelocity: 3,
    });
    expect(minimumSole()).toBeGreaterThan(HUNTER_ROAD_CONTACT_Y + 0.01);
  });

  it('bounds every hat/cape combination without allocating new equipment', () => {
    const hunter = new PlayerModel();
    const hats = Object.values(REWARD_ITEMS).filter((item) => item.slot === 'hat');
    const capes = Object.values(REWARD_ITEMS).filter((item) => item.slot === 'cape');
    const geometries = new Set<THREE.BufferGeometry>();
    hunter.group.traverse((node) => {
      if (node instanceof THREE.Mesh) geometries.add(node.geometry);
    });
    for (const hat of hats)
      for (const cape of capes) {
        if (hat.slot !== 'hat' || cape.slot !== 'cape') continue;
        hunter.equipHat(hat.color, hat.appearance);
        hunter.equipCape(cape.color, cape.appearance);
        const budget = report(hunter.group);
        expect(budget.triangles).toBeLessThanOrEqual(30000);
        expect(budget.draws).toBeLessThanOrEqual(65);
      }
    hunter.group.traverse((node) => {
      if (node instanceof THREE.Mesh) expect(geometries.has(node.geometry)).toBe(true);
    });
  });
  it('slides feet-first with a readable face while clearing the floor and overhead beam', () => {
    const hunter = new PlayerModel();
    const hats = Object.values(REWARD_ITEMS).filter((item) => item.slot === 'hat');
    const capes = Object.values(REWARD_ITEMS).filter((item) => item.slot === 'cape');
    for (const hat of hats)
      for (const cape of capes) {
        if (hat.slot !== 'hat' || cape.slot !== 'cape') continue;
        hunter.equipHat(hat.color, hat.appearance);
        hunter.equipCape(cape.color, cape.appearance);
        hunter.update(0.16, {
          running: true,
          sliding: true,
          airborne: false,
          lateralVelocity: 0,
          verticalVelocity: 0,
          dash: false,
          invulnerable: false,
          alive: true,
        });
        hunter.group.updateMatrixWorld(true);
        const bounds = new THREE.Box3();
        hunter.group.traverseVisible((node) => {
          if (!(node instanceof THREE.Mesh)) return;
          const point = new THREE.Vector3();
          for (let i = 0; i < node.geometry.getAttribute('position').count; i++) {
            node.getVertexPosition(i, point).applyMatrix4(node.matrixWorld);
            bounds.expandByPoint(point);
          }
        });
        expect(bounds.max.y).toBeLessThan(1.05);
        expect(bounds.min.y).toBeGreaterThanOrEqual(HUNTER_ROAD_CONTACT_Y - 0.001);
        const head = hunter.group.getObjectByName('hunter-head-pivot')!.getWorldPosition(new THREE.Vector3());
        const foot = hunter.group.getObjectByName('hunter-foot-1')!.getWorldPosition(new THREE.Vector3());
        expect(head.z).toBeLessThan(foot.z);
      }
  });
});
