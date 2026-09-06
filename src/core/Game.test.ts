import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Game } from './Game';
import { Input } from './Input';
import { Player } from '../entities/Player';
import { CameraController } from './Camera';
import { Combat } from '../systems/Combat';
import { Inventory } from '../systems/Inventory';
import { Cosmetics } from '../systems/Cosmetics';

let now = 0;
let game: Game;
let canvas: EventTarget;
let frames: FrameRequestCallback[];
function queueJump() {
  game.player.tryAction('jump');
  game.input.push('jump');
  game.player.update(1 / 60, game.input, true);
}
function land() {
  game.player.y = 0;
  game.player.jumping = false;
  game.player.update(1 / 60, game.input, true);
}

beforeEach(() => {
  now = 0;
  frames = [];
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('window', new EventTarget());
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  canvas = Object.assign(new EventTarget(), { style: {}, hasPointerCapture: () => false, setPointerCapture: () => {} });
  // Skip only browser/WebGL construction; run real Game methods, Player, Input,
  // Camera, Combat, Inventory and Cosmetics. UI/audio/render are boundary spies.
  game = Object.create(Game.prototype);
  Object.assign(game, {
    scene: new THREE.Scene(), player: new Player(), input: new Input(canvas as HTMLElement),
    cameraCtl: new CameraController(1), inventory: new Inventory(), cosmetics: new Cosmetics(),
    state: 'RUNNING_1', paused: false, stageIntroTimer: 0, accumulator: 0, STEP: 1 / 60,
    lastTime: 0, runElapsed: 0, distance: 0, segmentStart: 0, segmentLength: 650,
    runSpeed: 0, worldIdx: 0, autoSkill: false, currentBgm: null,
    monsters: [], obstacles: [], pickups: [], projectiles: [], boss: null,
    checkpoint: null, stats: { kills: 0, bossKills: 0 },
    effects: { emit: vi.fn(), update: vi.fn(), clear: vi.fn() },
    renderer: { render: vi.fn() },
    sound: { play: vi.fn(), stop: vi.fn() },
    env: { update: vi.fn(), setTheme: vi.fn() },
    spawner: { update: vi.fn(), reset: vi.fn() },
    hud: { update: vi.fn(), hide: vi.fn(), show: vi.fn(), hideBossBar: vi.fn(), showBanner: vi.fn(), setShade: vi.fn() },
    screens: {
      showPause: vi.fn(), hide: vi.fn(), showTitle: vi.fn(),
      hideStageIntro: vi.fn(), isStageIntroVisible: true,
      showStageIntro: vi.fn(), hideTutorialPrompt: vi.fn(), hideTutorialSkip: vi.fn(),
    },
  });
  Object.assign(game, { combat: new Combat(game) });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('game lifecycle input ownership', () => {
  it('clears both queues on pause and resume, including input typed while paused', () => {
    queueJump();
    game.togglePause();
    game.input.push('right');
    game.togglePause();
    land();
    expect(game.player.jumping).toBe(false);
    expect(game.player.lane).toBe(1);
  });
  it('prevents a held canvas gesture from completing across pause', () => {
    const pointer = (type: string, x: number) => {
      const event = new Event(type, { cancelable: true });
      Object.assign(event, { pointerId: 1, isPrimary: true, button: 0, clientX: x, clientY: 300 });
      canvas.dispatchEvent(event);
    };
    pointer('pointerdown', 100);
    game.togglePause();
    game.togglePause();
    pointer('pointermove', 200);
    expect(game.input.consumeAny(['right', 'jump'])).toBeNull();
  });
  it('clears Player intent on state transitions and intro dismissal', () => {
    queueJump();
    game.setState('RUNNING_2');
    land();
    expect(game.player.jumping).toBe(false);
    queueJump();
    game['stageIntroTimer'] = 1;
    game.dismissStageIntro();
    land();
    expect(game.player.jumping).toBe(false);
  });
  it('reset drops input and relocates rendering and camera without old shake', () => {
    game.input.push('left');
    game.player.z = 100;
    game.cameraCtl.mode = 'follow';
    game.cameraCtl.shake(1, 10);
    game['resetRun']();
    expect(game.input.consumeAny(['left'])).toBeNull();
    expect(game.player.group.position.z).toBe(0);
    expect(game.cameraCtl.camera.position.toArray()).toEqual([0, 4, -7]);
  });
  it.each(['paused', 'intro'] as const)('rejects direct HUD manual skills during %s', (state) => {
    if (state === 'paused') game.paused = true;
    else game['stageIntroTimer'] = 1;
    expect(game.combat.useSkill('dash')).toBe(false);
    expect(game.combat.cooldowns.dash).toBe(0);
    expect(game.player.dashTimer).toBe(0);
  });
});

describe('fixed-step/render integration', () => {
  it('snapshots before forward movement so render interpolation never alters collision position', () => {
    game['update'](1 / 60);
    const z = game.player.z;
    game.player.render(1 / 120, 0.5, true);
    expect(z).toBeGreaterThan(0);
    expect(game.player.group.position.z).toBeCloseTo(z / 2);
    expect(game.player.position.z).toBe(z);
  });
  it('updates presentation per rendered frame and freezes it while paused', () => {
    const render = vi.spyOn(game.player, 'render');
    const camera = vi.spyOn(game.cameraCtl, 'update');
    game.start();
    now = 8;
    frames.shift()?.(now);
    expect(render).toHaveBeenCalledTimes(1);
    expect(game.effects.update).toHaveBeenCalledWith(0.008);
    const position = game.player.group.position.clone();
    game.paused = true;
    now = 24;
    frames.shift()?.(now);
    expect(render).toHaveBeenCalledTimes(1);
    expect(camera).toHaveBeenCalledTimes(1);
    expect(game.effects.update).toHaveBeenCalledTimes(1);
    expect(game.player.group.position.equals(position)).toBe(true);
    expect(game.renderer.render).toHaveBeenCalledTimes(2);
  });
});
