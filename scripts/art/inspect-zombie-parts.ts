import {buildZombieMonster} from '../../src/visual/creatures/v2/zombie';
import * as THREE from 'three';
const rows:{name:string,triangles:number}[]=[];buildZombieMonster('zombie',0)!.traverse(o=>{if(o instanceof THREE.Mesh)rows.push({name:o.name,triangles:(o.geometry.index?.count??o.geometry.attributes.position.count)/3})});console.log(rows.sort((a,b)=>b.triangles-a.triangles));
