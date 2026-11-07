import * as THREE from 'three';
import { applyBakedSkin, type BakedSkinPayload } from './zombieLabBakedSkin';
import worker from './generated/skin/zombie.json';
import giant from './generated/skin/giantZombie.json';
import king from './generated/skin/zombieKing.json';
import { applyZombieFidelityMaterials } from './zombieFidelityMaterials';
import { applyAnimalFidelityMaterials } from './animalFidelityMaterials';
const skins: Record<string, BakedSkinPayload> = { zombie: worker, giantZombie: giant, zombieKing: king };
export function applyZombieRuntimeMaterials(group: THREE.Group, id: string): void {
  if (group.userData.zombieLabAuthoredMaterials === id) return;
  if (id === 'zombieDog' || id === 'crow') applyAnimalFidelityMaterials(group);
  else applyZombieFidelityMaterials(group);
  const payload = skins[id];
  if (payload) {
    const mesh = group.getObjectByName('single-continuous-torso-shoulders-arms');
    if (!(mesh instanceof THREE.Mesh)) throw new Error(`Missing authored body for ${id}`);
    applyBakedSkin(mesh, payload);
  }
  group.userData.zombieLabAuthoredMaterials = id;
}
