import {buildDraculaMonster} from '../../src/visual/creatures/v2/dracula';
import * as THREE from 'three';
const g=buildDraculaMonster('wolf',0)!;const d:Record<string,number>={};g.traverse(o=>{if(o instanceof THREE.Mesh)d[o.name]=(d[o.name]??0)+(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});console.log(d);
