import * as THREE from 'three';
import { applyBakedSkin, type BakedSkinPayload } from './zombieLabBakedSkin';
import frank from './generated/skin/frankenstein.json';
import { applyFrankensteinGarmentMaterials } from './zombieLabFidelityMaterials';
import { applyLabFidelityMaterials } from './labFidelityMaterials';
const skins: Record<string, BakedSkinPayload> = { frankenstein: frank };
export function applyLabRuntimeMaterials(group: THREE.Group, id: string): void {
  if (group.userData.zombieLabAuthoredMaterials === id) return;
  if (id === 'frankenstein') applyFrankensteinGarmentMaterials(group);
  else applyLabFidelityMaterials(group);
  const payload = skins[id];
  if (payload) {
    const mesh = group.getObjectByName('single-continuous-torso-shoulders-arms');
    if (!(mesh instanceof THREE.Mesh)) throw new Error(`Missing authored body for ${id}`);
    applyBakedSkin(mesh, payload);
  }
  group.userData.zombieLabAuthoredMaterials = id;
}
