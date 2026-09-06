import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Player } from './Player';
import { Inventory } from '../systems/Inventory';
import { Cosmetics } from '../systems/Cosmetics';
import { REWARD_ITEMS } from '../data/worlds';

function visibleGeometry(player: Player): string {
  player.group.updateMatrixWorld(true);
  const parts: number[][] = [];
  player.group.traverseVisible((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const geometry: THREE.BufferGeometry = node.geometry;
    const positions = geometry.getAttribute('position');
    parts.push([
      ...node.matrixWorld.elements,
      ...Array.from(positions.array),
    ].map(value => Math.round(value * 10000)));
  });
  return JSON.stringify(parts);
}

function ownedGeometry(player: Player): Set<THREE.BufferGeometry> {
  const geometry = new Set<THREE.BufferGeometry>();
  player.group.traverse(node => {
    if (node instanceof THREE.Mesh) geometry.add(node.geometry);
  });
  return geometry;
}

describe('reward model identities', () => {
  it.each(['hat', 'cape'] as const)('renders distinct %s shapes, not just different colors', (slot) => {
    const player = new Player();
    const inventory = new Inventory();
    const cosmetics = new Cosmetics();
    const shapes = new Set<string>();
    const rewards = Object.entries(REWARD_ITEMS).filter(([, item]) => item.slot === slot);
    for (const [id] of rewards) {
      inventory.grantItem(id, slot);
      cosmetics.apply(player, inventory);
      shapes.add(visibleGeometry(player));
    }
    expect(shapes.size).toBe(rewards.length);
  });

  it('reuses the same geometry through repeated equipment changes and reset', () => {
    const player = new Player();
    const inventory = new Inventory();
    const cosmetics = new Cosmetics();
    const before = ownedGeometry(player);
    for (let run = 0; run < 10; run++) {
      for (const [id, reward] of Object.entries(REWARD_ITEMS)) {
        inventory.grantItem(id, reward.slot);
        cosmetics.apply(player, inventory);
      }
      player.resetForRun();
    }
    expect(ownedGeometry(player)).toEqual(before);
    expect(player.hasCape).toBe(true);
    expect(player.hasHat).toBe(true);
  });

  it('keeps every equipped slide below the overhead obstacle clearance', () => {
    const player = new Player();
    const inventory = new Inventory();
    const cosmetics = new Cosmetics();
    for (const [id, reward] of Object.entries(REWARD_ITEMS)) {
      inventory.grantItem(id, reward.slot);
      cosmetics.apply(player, inventory);
      player.sliding = true;
      player.render(0.1, 1, true);
      player.group.updateMatrixWorld(true);
      const bounds = new THREE.Box3();
      player.group.traverseVisible((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        node.geometry.computeBoundingBox();
        if (node.geometry.boundingBox) bounds.union(node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld));
      });
      expect(bounds.max.y, id).toBeLessThan(1.05);
    }
  });
});
