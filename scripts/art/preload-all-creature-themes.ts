/** Offline tools deliberately load every theme; never import this entry from the game. */
import { loadAllCreatureWorlds } from '../../src/visual/CreatureRegistry';
await loadAllCreatureWorlds();
