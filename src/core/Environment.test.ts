import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Environment } from './Environment';

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
});
