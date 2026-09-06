import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Boss } from './Boss';
import { Game } from '../core/Game';
import { Player } from './Player';
import { WORLDS } from '../data/worlds';

describe('chase lock warning', () => {
  it('keeps the locked lane visible and fixed until the strike', () => {
    const scene = new THREE.Scene();
    const player = new Player();
    const game: Game = Object.assign(Object.create(Game.prototype), {
      scene, player, sound: { play: vi.fn() }, cameraCtl: { shake: vi.fn() },
      hud: { setShade: vi.fn() }, damagePlayer: vi.fn(),
    });
    const boss = new Boss({
      ...WORLDS[0].midBoss,
      patterns: { chase: { type: 'chase', telegraph: 0.2, lockTime: 0.35, damage: 10 } },
      phases: [{ from: 1, queue: ['chase'], gap: 0 }],
    }, game, 12);
    // Advance the real intro -> gap -> telegraph -> active state machine.
    for (let i = 0; i < 180 && boss.state !== 'active'; i++) boss.update(1 / 60);
    expect(boss.state).toBe('active');
    const marker = scene.children.find((node) => node.visible);
    expect(marker).toBeDefined();
    const x = marker?.position.x;
    player.lane = 0;
    boss.update(0.1);
    expect(marker?.visible).toBe(true);
    expect(marker?.position.x).toBe(x);
    boss.update(0.3);
    expect(marker?.visible).toBe(false);
    boss.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
