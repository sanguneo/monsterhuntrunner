import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const loading = vi.hoisted(() => ({
  ready: new Set<string>(),
  jobs: new Map<string, { resolve: () => void; reject: (error: Error) => void }>(),
}));
vi.mock('../visual/CreaturePreload', () => ({
  isCreatureWorldReady: (world: string) => loading.ready.has(world),
  preloadCreatureWorld: (world: string) =>
    new Promise<void>((resolve, reject) =>
      loading.jobs.set(world, {
        resolve: () => {
          loading.ready.add(world);
          resolve();
        },
        reject,
      }),
    ),
}));
vi.mock('../ui/WorldAssetLoading', () => ({ showWorldAssetLoading: vi.fn(), hideWorldAssetLoading: vi.fn() }));
import { Game } from './Game';
import { showWorldAssetLoading, hideWorldAssetLoading } from '../ui/WorldAssetLoading';
let game: Game;
const tick = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
beforeEach(() => {
  vi.clearAllMocks();
  loading.ready.clear();
  loading.jobs.clear();
  vi.stubGlobal('sessionStorage', { getItem: () => '1' });
  game = Object.create(Game.prototype) as Game;
  Object.assign(game, {
    worldIdx: 0,
    state: 'TITLE',
    unlockedWorldIdx: () => 5,
    applyWorldTheme: vi.fn(),
    resetRun: vi.fn(),
    setState: vi.fn(),
    input: { clear: vi.fn() },
    player: { clearActions: vi.fn() },
    screens: { preloadWorld: vi.fn(), showTitle: vi.fn() },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe('Game world selection/load integration', () => {
  it('commits only newest ready world, never mutates selection while loading', async () => {
    game.selectWorld(1);
    game.selectWorld(2);
    expect(game.worldIdx).toBe(0);
    expect(game.screens.showTitle).not.toHaveBeenCalled();
    loading.jobs.get('zombie')!.resolve();
    await tick();
    expect(game.worldIdx).toBe(0);
    loading.jobs.get('lab')!.resolve();
    await tick();
    expect(game.worldIdx).toBe(2);
    expect(game.screens.preloadWorld).toHaveBeenCalledWith(2);
  });
  it('next-world failure retains old world and run state until explicit successful retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    game.startNextWorld();
    expect(game.worldIdx).toBe(0);
    expect(game.setState).not.toHaveBeenCalled();
    loading.jobs.get('zombie')!.reject(new Error('offline'));
    await tick();
    expect(game.worldIdx).toBe(0);
    expect(game.setState).not.toHaveBeenCalled();
    const calls = vi.mocked(showWorldAssetLoading).mock.calls;
    const retry = calls[calls.length - 1][1]!;
    retry();
    loading.jobs.get('zombie')!.resolve();
    await tick();
    expect(game.worldIdx).toBe(1);
    expect(game.setState).toHaveBeenCalledWith('RUNNING_1');
  });
  it('ready start remains synchronous; title cancellation prevents late world entry', async () => {
    loading.ready.add('school');
    game.startRun(false);
    expect(game.setState).toHaveBeenCalledWith('RUNNING_1');
    vi.mocked(game.setState).mockClear();
    game.selectWorld(1);
    game.toTitle();
    loading.jobs.get('zombie')!.resolve();
    await tick();
    expect(game.worldIdx).toBe(0);
    expect(game.setState).toHaveBeenCalledTimes(1);
    expect(game.setState).toHaveBeenCalledWith('TITLE');
    expect(hideWorldAssetLoading).toHaveBeenCalled();
  });
  it('rejects invalid or locked selections without fetching', () => {
    Object.assign(game, { unlockedWorldIdx: () => 0 });
    for (const idx of [-1, 1, 99, NaN, 0.5]) game.selectWorld(idx);
    expect(loading.jobs.size).toBe(0);
    expect(game.worldIdx).toBe(0);
  });
});
