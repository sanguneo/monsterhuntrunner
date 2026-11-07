/** Offline compatibility dispatcher; production themes import only their own atlas module. */
import type * as THREE from 'three';
import { applyZombieRuntimeMaterials } from './zombieRuntimeMaterials';
import { applyLabRuntimeMaterials } from './labRuntimeMaterials';
export function applyZombieLabRuntimeMaterials(group: THREE.Group, id: string): void {
  if (['zombie', 'zombieDog', 'crow', 'giantZombie', 'zombieKing'].includes(id)) applyZombieRuntimeMaterials(group, id);
  else applyLabRuntimeMaterials(group, id);
}
