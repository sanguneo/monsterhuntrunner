import * as THREE from 'three';
import { bakeStaticModel } from './ModelKit';
import { creatureBuildersFor } from './CreatureRegistry';

const templates = new Map<string, THREE.Group>();

/** Construct once during loading; this private immutable template is never attached to an encounter. */
export function prewarmBossModel(id: string): void {
  if (templates.has(id)) return;
  const source = creatureBuildersFor(id).boss(id);
  if (!source) throw new Error(`Unknown boss model: ${id}`);
  source.name = id;
  const design = source.userData;
  const model = bakeStaticModel(source);
  model.userData = { ...design, creatureRevision: 'concept-v2', identity: id };
  templates.set(id, model);
}

/** Each encounter owns deep resource copies; fading/disposal cannot mutate the template or another boss. */
export function createBossModel(id: string): THREE.Group {
  prewarmBossModel(id);
  const model = templates.get(id)!.clone(true);
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry = object.geometry.clone();
    object.material = Array.isArray(object.material)
      ? object.material.map((material) => material.clone())
      : object.material.clone();
  });
  return model;
}
