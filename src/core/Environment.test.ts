import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Environment } from './Environment';
import { WORLDS } from '../data/worlds';

describe('recycled scenery', () => {
  it('restores the same local coverage after a long run and a restart', () => {
    const scene = new THREE.Scene();
    const environment = new Environment(scene);
    environment.update(0);
    const initial = scene.children.map((node) => node.position.toArray());
    environment.update(1000);
    environment.update(0);
    expect(scene.children.map((node) => node.position.toArray())).toEqual(initial);
  });

  it('does not grow the scene across repeated forward and backward relocations', () => {
    const scene = new THREE.Scene();
    const environment = new Environment(scene);
    const count = scene.children.length;
    for (const z of [0, 2000, 40, 10000, 0]) environment.update(z);
    expect(scene.children).toHaveLength(count);
  });

  it('retains shared resources through every theme switch and absolute relocation', () => {
    const scene = new THREE.Scene();
    const environment = new Environment(scene);
    const resources = () => {
      const meshes: THREE.Mesh[] = [];
      scene.traverse((node) => {
        if (node instanceof THREE.Mesh) meshes.push(node);
      });
      return meshes.map((mesh) => ({ mesh, geometry: mesh.geometry, material: mesh.material }));
    };
    const initial = resources();
    let disposals = 0;
    const geometries = new Set(initial.map((resource) => resource.geometry));
    const materials = new Set(initial.flatMap((resource) => resource.material));
    for (const resource of [...geometries, ...materials])
      resource.addEventListener('dispose', () => {
        disposals++;
      });
    // More instances than unique geometry proves chunk clones share the baked assets.
    expect(initial.length).toBeGreaterThan(geometries.size * 4);
    for (const z of [0, 2000, -1000, 10000, 0]) {
      for (const world of WORLDS) {
        environment.setTheme(world.theme);
        environment.update(z);
      }
    }
    const final = resources();
    expect(final).toHaveLength(initial.length);
    final.forEach((resource, i) => {
      expect(resource.mesh).toBe(initial[i].mesh);
      expect(resource.geometry).toBe(initial[i].geometry);
      expect(resource.material).toBe(initial[i].material);
    });
    expect(disposals).toBe(0);
  });

  it('keeps continuous coverage behind the camera and beyond the fog after arbitrary jumps', () => {
    const scene = new THREE.Scene();
    const environment = new Environment(scene);
    const chunks = scene.children.filter((node) => node instanceof THREE.Group);
    for (const z of [0, 15.99, 16, 128, 2000.25, -1000.5, 100000, 0]) {
      environment.update(z);
      const centers = chunks.map((chunk) => chunk.position.z - z).sort((a, b) => a - b);
      const spacing = centers[1] - centers[0];
      for (let i = 1; i < centers.length; i++) expect(centers[i] - centers[i - 1]).toBeCloseTo(spacing);
      expect(centers[0] - spacing / 2).toBeLessThanOrEqual(-7);
      expect(centers[centers.length - 1] + spacing / 2).toBeGreaterThanOrEqual(80);
    }
  });

  it('bounds every active set and keeps raised decoration outside the playable envelope', () => {
    const scene = new THREE.Scene();
    const environment = new Environment(scene);
    for (const world of WORLDS) {
      environment.setTheme(world.theme);
      scene.updateMatrixWorld(true);
      let triangles = 0;
      let draws = 0;
      let intrusions = 0;
      const point = new THREE.Vector3();
      scene.traverseVisible((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        draws++;
        const positions = node.geometry.getAttribute('position');
        triangles += (node.geometry.index?.count ?? positions.count) / 3;
        for (let i = 0; i < positions.count; i++) {
          point.fromBufferAttribute(positions, i).applyMatrix4(node.matrixWorld);
          if (point.y > 0.05 && Math.abs(point.x) <= 3) intrusions++;
        }
      });
      expect(triangles).toBeLessThanOrEqual(60000);
      expect(draws).toBeLessThanOrEqual(160);
      expect(intrusions).toBe(0);
      const floor = scene.children.find((node) => node instanceof THREE.Mesh) as THREE.Mesh<
        THREE.PlaneGeometry,
        THREE.MeshStandardMaterial
      >;
      expect(floor.material.color.getHex()).toBe(world.theme.floor);
    }
  });
});
