import type * as THREE from 'three';
import { WORLDS } from '../data/worlds';

export interface CreatureBuilders {
  monster: (id: string, color: number) => THREE.Group | undefined;
  boss: (id: string) => THREE.Group | undefined;
}
export type CreatureWorldLoader = () => Promise<CreatureBuilders>;
/** Imports stay dynamic: no theme geometry/atlas is reachable through the initial static graph. */
const loaders: Record<string, CreatureWorldLoader> = {
  school: () =>
    import('./creatures/v2/school').then((m) => ({ monster: m.buildSchoolMonster, boss: m.buildSchoolBoss })),
  zombie: () =>
    import('./creatures/v2/zombie').then((m) => ({ monster: m.buildZombieMonster, boss: m.buildZombieBoss })),
  lab: () => import('./creatures/v2/lab').then((m) => ({ monster: m.buildLabMonster, boss: m.buildLabBoss })),
  sea: () => import('./creatures/v2/sea').then((m) => ({ monster: m.buildSeaMonster, boss: m.buildSeaBoss })),
  dracula: () =>
    import('./creatures/v2/dracula').then((m) => ({ monster: m.buildDraculaMonster, boss: m.buildDraculaBoss })),
  skull: () => import('./creatures/v2/skull').then((m) => ({ monster: m.buildSkullMonster, boss: m.buildSkullBoss })),
};
export class CreatureWorldRegistry {
  private ready = new Map<string, CreatureBuilders>();
  private pending = new Map<string, Promise<void>>();
  constructor(private readonly sources: Record<string, CreatureWorldLoader>) {}
  has(world: string): boolean {
    return this.ready.has(world);
  }
  load(world: string): Promise<void> {
    if (this.ready.has(world)) return Promise.resolve();
    const pending = this.pending.get(world);
    if (pending) return pending;
    const source = this.sources[world];
    if (!source) return Promise.reject(new Error(`Unknown creature world: ${world}`));
    const request = Promise.resolve()
      .then(source)
      .then((builders) => {
        if (typeof builders.monster !== 'function' || typeof builders.boss !== 'function')
          throw new Error(`Invalid creature module: ${world}`);
        this.ready.set(world, builders);
      })
      .finally(() => {
        this.pending.delete(world);
      });
    this.pending.set(world, request);
    return request;
  }
  get(world: string): CreatureBuilders {
    const result = this.ready.get(world);
    if (!result)
      throw new Error(`Creature world '${world}' is not loaded. Await preloadCreatureWorld before spawning.`);
    return result;
  }
}
const registry = new CreatureWorldRegistry(loaders);
const identities = new Map(
  WORLDS.flatMap((world) =>
    [...world.monsters.map((m) => m.id), world.midBoss.id, world.finalBoss.id].map((id) => [id, world.id] as const),
  ),
);
export function loadCreatureWorld(world: string): Promise<void> {
  return registry.load(world);
}
export async function loadAllCreatureWorlds(): Promise<void> {
  for (const world of WORLDS) await registry.load(world.id);
}
export function creatureBuildersFor(id: string): CreatureBuilders {
  const world = identities.get(id);
  if (!world) throw new Error(`Unknown creature identity: ${id}`);
  return registry.get(world);
}
