import { WORLDS } from '../data/worlds';
import { prewarmBossModel } from './BossModels';
import { createMonsterModel } from './MonsterModels';
import { loadCreatureWorld } from './CreatureRegistry';
const warmed = new Set<string>();
const pending = new Map<string, Promise<void>>();
const yieldToBrowser = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
export function isCreatureWorldReady(world: string): boolean {
  return warmed.has(world);
}
/** Fetch only this theme, then prepare its five immutable templates behind the loading UI. */
export function preloadCreatureWorld(worldId: string, yieldToUi: () => Promise<void> = yieldToBrowser): Promise<void> {
  if (warmed.has(worldId)) return Promise.resolve();
  const active = pending.get(worldId);
  if (active) return active;
  const world = WORLDS.find((w) => w.id === worldId);
  if (!world) return Promise.reject(new Error(`Unknown creature world: ${worldId}`));
  const request = (async () => {
    await loadCreatureWorld(worldId);
    for (const def of world.monsters) {
      createMonsterModel(def);
      await yieldToUi();
    }
    for (const def of [world.midBoss, world.finalBoss]) {
      prewarmBossModel(def.id);
      await yieldToUi();
    }
    warmed.add(worldId);
  })().finally(() => pending.delete(worldId));
  pending.set(worldId, request);
  return request;
}
/** Explicit offline/test all-theme helper; production boot must call preloadCreatureWorld instead. */
export async function prewarmCreatureModels(yieldToUi: () => Promise<void> = yieldToBrowser): Promise<void> {
  for (const world of WORLDS) {
    await loadCreatureWorld(world.id);
    for (const def of world.monsters) {
      createMonsterModel(def);
      await yieldToUi();
    }
    for (const def of [world.midBoss, world.finalBoss]) {
      prewarmBossModel(def.id);
      await yieldToUi();
    }
    warmed.add(world.id);
  }
}
