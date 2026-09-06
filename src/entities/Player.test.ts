import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Player } from './Player';
import { Input } from '../core/Input';
import { CONFIG, laneX } from '../data/config';

let time = 0;
let input: Input;
let player: Player;
const dt = 1 / 60;
function step(count = 1) {
  for (let i = 0; i < count; i++) {
    time += dt;
    player.update(dt, input, true);
  }
}
beforeEach(() => {
  time = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => time * 1000);
  vi.stubGlobal('window', new EventTarget());
  input = new Input(Object.assign(new EventTarget(), { style: {} }) as HTMLElement);
  player = new Player();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('bounded vertical intent', () => {
  it('expires an early queued jump rather than bouncing on landing', () => {
    player.tryAction('jump');
    step(3);
    input.push('jump');
    step(57);
    expect(player.jumping).toBe(false);
    expect(player.y).toBe(0);
  });
  it('fires a near-landing jump once', () => {
    const sfx = vi.fn();
    player.sfx = sfx;
    player.tryAction('jump');
    step(35);
    input.push('jump');
    step(12);
    expect(player.jumping).toBe(true);
    expect(sfx.mock.calls.filter(([id]) => id === 'jump')).toHaveLength(2);
    step(60);
    expect(player.jumping).toBe(false);
    expect(sfx.mock.calls.filter(([id]) => id === 'jump')).toHaveLength(2);
  });
  it('counts input-buffer age as part of the total 150ms, not a new queue lifetime', () => {
    player.tryAction('jump');
    step(31);
    input.push('jump');
    time += 0.14;
    step(20);
    expect(player.jumping).toBe(false);
  });
  it('fast-falls immediately but expires the landing-slide intent on a long fall', () => {
    player.tryAction('jump');
    player.y = 10;
    input.push('slide');
    step();
    expect(player.y).toBeLessThan(10 - 14 * dt);
    step(59);
    expect(player.y).toBe(0);
    expect(player.sliding).toBe(false);
  });
  it('slides on a nearby landing after fast-fall', () => {
    player.tryAction('jump');
    player.y = 0.3;
    input.push('slide');
    step(2);
    expect(player.sliding).toBe(true);
    step(40);
    expect(player.sliding).toBe(false);
  });
  it('a fresh successful vertical action supersedes older queued intent', () => {
    player.tryAction('jump');
    step(35);
    input.push('jump');
    step();
    player.y = 0;
    player.jumping = false;
    input.push('slide');
    step();
    expect(player.sliding).toBe(true);
    expect(player.jumping).toBe(false);
  });
  it('clears queued intent when control is disabled and on reset', () => {
    player.tryAction('jump');
    input.push('jump');
    step();
    player.update(dt, input, false);
    player.y = 0;
    player.jumping = false;
    step();
    expect(player.jumping).toBe(false);
    player.tryAction('jump');
    input.push('jump');
    step();
    player.resetForRun();
    step();
    expect(player.jumping).toBe(false);
  });
});

describe('continuous lanes and render authority', () => {
  it('bounds two-lane retarget speed by a single lane traversal rate', () => {
    player.tryAction('left');
    step(10);
    expect(player.x).toBe(laneX(0));
    player.tryAction('right');
    player.tryAction('right');
    let previous = player.x;
    for (let i = 0; i < 16; i++) {
      step();
      expect(Math.abs(player.x - previous)).toBeLessThanOrEqual(CONFIG.lanes.spacing / CONFIG.lanes.moveTime * dt + 1e-9);
      expect(player.x).toBeLessThanOrEqual(previous);
      previous = player.x;
    }
    expect(player.x).toBe(laneX(2));
  });
  it('retargets mid-motion continuously and stays inside lane bounds', () => {
    player.tryAction('left');
    step(2);
    const before = player.x;
    player.tryAction('right');
    expect(player.x).toBe(before);
    step();
    expect(player.x).toBeLessThan(before);
    for (let i = 0; i < 30; i++) {
      player.tryAction(i % 2 ? 'left' : 'right');
      step();
      expect(Math.abs(player.x)).toBeLessThanOrEqual(CONFIG.lanes.spacing);
    }
  });
  it('ArrowLeft moves screen-left with the real +Z-facing camera and unchanged lane indices', () => {
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 220);
    camera.position.set(0, 4, -7);
    camera.lookAt(0, 1.2, 9);
    camera.updateMatrixWorld();
    const key = new Event('keydown', { cancelable: true });
    Object.assign(key, { code: 'ArrowLeft' });
    window.dispatchEvent(key);
    step(10);
    expect(player.lane).toBe(0);
    expect(new THREE.Vector3(player.x, 0.8, player.z).project(camera).x).toBeLessThan(0);
  });
  it('interpolates the view while authoritative position follows the fixed step', () => {
    player.beginStep();
    player.z += 1;
    player.tryAction('left');
    step();
    const authoritative = player.position.clone();
    player.render(dt, 0.5, true);
    expect(player.group.position.z).toBe(0.5);
    expect(player.group.position.x).toBeCloseTo(player.x * 0.5);
    expect(player.position.equals(authoritative)).toBe(true);
    expect(player.position).not.toBe(player.group.position);
    player.group.position.set(99, 99, 99);
    expect(player.position.equals(authoritative)).toBe(true);
  });
  it('synchronizes both render snapshots on reset and relocation', () => {
    player.z = 100;
    player.syncRender();
    player.render(dt, 0, false);
    expect(player.group.position.z).toBe(100);
    player.resetForRun();
    player.render(dt, 0.5, false);
    expect(player.group.position.toArray()).toEqual([0, 0, 0]);
  });
});
