import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Monster } from '../entities/Monster';
import { Boss } from '../entities/Boss';
import { Game } from '../core/Game';
import { WORLDS } from '../data/worlds';

function meshes(group: THREE.Object3D): THREE.Mesh[] {
  const result: THREE.Mesh[] = [];
  group.traverse(object => { if (object instanceof THREE.Mesh) result.push(object); });
  return result;
}

function report(id: string, body: THREE.Object3D): void {
  body.updateMatrixWorld(true);
  const parts = meshes(body);
  const triangles = parts.reduce((sum, mesh) => sum +
    (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3, 0);
  const box = new THREE.Box3().setFromObject(body);
  const size = box.getSize(new THREE.Vector3());
  expect(size.toArray().every(value => Number.isFinite(value) && value > 0)).toBe(true);
  console.info(`${id}: ${triangles} triangles; ${parts.length} draws; bounds ${box.min.toArray().map(v => v.toFixed(2))} / ${box.max.toArray().map(v => v.toFixed(2))}`);
}

function gameStub(): Game {
  // Only the WebGL/DOM constructor is bypassed; use the real Game prototype.
  return Object.assign(Object.create(Game.prototype), {
    scene: new THREE.Scene(),
    hud: { setShade: vi.fn() },
  });
}

describe('enemy visual integration and resource ownership', () => {
  it('shares immutable monster resources but keeps per-spawn transforms independent', () => {
    for (const def of WORLDS.flatMap(world => world.monsters)) {
      const a = new Monster(def, 0, 10);
      const b = new Monster(def, 2, 20);
      const aParts = meshes(a.mesh);
      const bParts = meshes(b.mesh);
      aParts.forEach((part, index) => {
        expect(part).not.toBe(bParts[index]);
        expect(part.geometry).toBe(bParts[index].geometry);
        expect(part.material).toBe(bParts[index].material);
      });
      // Rest-pose local bounds are deterministic despite the runtime random bob phase.
      report(def.id, a.mesh.children[0]);
      b.mesh.updateMatrixWorld(true);
      const before = b.mesh.children[0].matrixWorld.clone();
      a.update(0.1, 0);
      b.mesh.updateMatrixWorld(true);
      expect(b.mesh.children[0].matrixWorld.equals(before)).toBe(true);
      expect(b.z).toBe(20);
    }
  });

  it('owns boss resources per encounter and releases each body resource on disposal', () => {
    for (const def of WORLDS.flatMap(world => [world.midBoss, world.finalBoss])) {
      const a = new Boss(def, gameStub(), 12);
      const b = new Boss(def, gameStub(), 12);
      const aBody = a.group.children[0];
      const aParts = meshes(aBody);
      const bParts = meshes(b.group.children[0]);
      const bGeometries = new Set(bParts.map(part => part.geometry));
      const bMaterials = new Set(bParts.flatMap(part => Array.isArray(part.material) ? part.material : [part.material]));
      const resources = new Set(aParts.flatMap(part => [part.geometry, ...(Array.isArray(part.material) ? part.material : [part.material])]));
      let released = 0;
      for (const resource of resources) resource.addEventListener('dispose', () => { released++; });
      aParts.forEach(part => {
        expect(bGeometries.has(part.geometry)).toBe(false);
        for (const material of Array.isArray(part.material) ? part.material : [part.material]) {
          expect(bMaterials.has(material)).toBe(false);
        }
      });
      report(def.id, aBody);
      a.state = 'dead';
      a.update(0.1);
      for (const part of aParts) {
        for (const material of Array.isArray(part.material) ? part.material : [part.material]) {
          expect(material.opacity).toBeCloseTo(0.92);
        }
      }
      for (const material of bMaterials) expect(material.opacity).toBe(1);
      a.dispose();
      expect(released).toBe(resources.size);
      b.dispose();
    }
  });
});
