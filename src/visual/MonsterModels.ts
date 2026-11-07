import * as THREE from 'three';
import type { MonsterDef } from '../data/worlds';
import { bakeStaticModel } from './ModelKit';
import { creatureBuildersFor } from './CreatureRegistry';

const templates = new Map<string, THREE.Group>();

/** Concept-first adversaries. Immutable geometry/material templates remain shared between mobs. */
export function createMonsterModel(def: Pick<MonsterDef, 'id' | 'color'>): THREE.Group {
  const key = `${def.id}:${def.color}`;
  let template = templates.get(key);
  if (!template) {
    const source = creatureBuildersFor(def.id).monster(def.id, def.color);
    if (!source) throw new Error(`Unknown monster model: ${def.id}`);
    source.name = def.id;
    const design = source.userData;
    template = bakeStaticModel(source);
    template.userData = { ...design, creatureRevision: 'concept-v2', identity: def.id };
    templates.set(key, template);
  }
  return template.clone(true);
}
