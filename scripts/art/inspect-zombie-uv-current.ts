import {buildDetailedZombieSkin} from '../../src/visual/creatures/v2/zombieSkinAnatomy';
import {skinGeometryFnv32} from '../../src/visual/creatures/v2/zombieLabSkinUv';
import {readFileSync} from 'node:fs';
for(const id of ['zombie','giantZombie','zombieKing'] as const){const g=buildDetailedZombieSkin(id),p=JSON.parse(readFileSync(`src/visual/creatures/v2/generated/skin/${id}.json`,'utf8'));console.log(id,g.attributes.position.count,skinGeometryFnv32(g),p.atlas.vertexCount,p.atlas.geometryFnv32);}
