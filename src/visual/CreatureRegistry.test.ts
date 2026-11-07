import { describe, it, expect, vi } from 'vitest';
import { CreatureWorldRegistry } from './CreatureRegistry';
import { WorldAssetGate } from './WorldAssetGate';
const builders = { monster: () => undefined, boss: () => undefined };
const tick = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
describe('lazy thematic module registry', () => {
  it('loads only requested theme, coalesces requests and does not refetch ready modules', async () => {
    const school = vi.fn(async () => builders),
      lab = vi.fn(async () => builders);
    const r = new CreatureWorldRegistry({ school, lab });
    expect(() => r.get('school')).toThrow('not loaded');
    const a = r.load('school'),
      b = r.load('school');
    expect(a).toBe(b);
    await a;
    await r.load('school');
    expect(school).toHaveBeenCalledTimes(1);
    expect(lab).not.toHaveBeenCalled();
    expect(r.get('school')).toBe(builders);
    await expect(r.load('unknown')).rejects.toThrow('Unknown');
  });
  it('never installs a failed module and permits explicit retry', async () => {
    const loader = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(builders);
    const r = new CreatureWorldRegistry({ lab: loader });
    await expect(r.load('lab')).rejects.toThrow('offline');
    expect(r.has('lab')).toBe(false);
    expect(() => r.get('lab')).toThrow('not loaded');
    await r.load('lab');
    expect(r.has('lab')).toBe(true);
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
describe('transactional world loading gate', () => {
  it('does not commit early and ignores out-of-order selection completion', async () => {
    const resolve: Record<string, () => void> = {};
    const gate = new WorldAssetGate(
      () => false,
      (id) =>
        new Promise<void>((r) => {
          resolve[id] = r;
        }),
    );
    const commits: string[] = [],
      ui = { loading: vi.fn(), done: vi.fn(), failed: vi.fn() };
    gate.enter('zombie', () => commits.push('zombie'), ui);
    gate.enter('lab', () => commits.push('lab'), ui);
    expect(commits).toEqual([]);
    resolve.zombie();
    await tick();
    expect(commits).toEqual([]);
    resolve.lab();
    await tick();
    expect(commits).toEqual(['lab']);
    expect(ui.done).toHaveBeenCalledTimes(1);
  });
  it('preserves old state on failure, offers retry, and cancels stale retry callbacks', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue(undefined);
    const gate = new WorldAssetGate(() => false, load);
    const commit = vi.fn(),
      ui = { loading: vi.fn(), done: vi.fn(), failed: vi.fn() };
    gate.enter('sea', commit, ui);
    await tick();
    expect(commit).not.toHaveBeenCalled();
    expect(ui.done).not.toHaveBeenCalled();
    const retry = ui.failed.mock.calls[0][1] as () => void;
    retry();
    await tick();
    expect(commit).toHaveBeenCalledTimes(1);
    gate.cancel();
    retry();
    await tick();
    expect(commit).toHaveBeenCalledTimes(1);
  });
  it('keeps ready-world paths synchronous and cancellation prevents entering play', async () => {
    const commit = vi.fn(),
      ui = { loading: vi.fn(), done: vi.fn(), failed: vi.fn() };
    new WorldAssetGate(() => true, vi.fn()).enter('school', commit, ui);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(ui.loading).not.toHaveBeenCalled();
    let release!: () => void;
    const gate = new WorldAssetGate(
      () => false,
      () =>
        new Promise<void>((r) => {
          release = r;
        }),
    );
    gate.enter('lab', commit, ui);
    gate.cancel();
    release();
    await tick();
    expect(commit).toHaveBeenCalledTimes(1);
  });
});

it('prepares only the requested five templates and leaves another world unavailable to factories', async () => {
  const { preloadCreatureWorld, isCreatureWorldReady } = await import('./CreaturePreload');
  const { createMonsterModel } = await import('./MonsterModels');
  const { createBossModel } = await import('./BossModels');
  const { WORLDS } = await import('../data/worlds');
  const yields = vi.fn(async () => {});
  await preloadCreatureWorld('school', yields);
  expect(yields).toHaveBeenCalledTimes(5);
  expect(isCreatureWorldReady('school')).toBe(true);
  expect(isCreatureWorldReady('zombie')).toBe(false);
  expect(() => createMonsterModel(WORLDS[1].monsters[0])).toThrow('not loaded');
  expect(() => createBossModel(WORLDS[1].midBoss.id)).toThrow('not loaded');
  await preloadCreatureWorld('school', yields);
  expect(yields).toHaveBeenCalledTimes(5);
}, 30000);
