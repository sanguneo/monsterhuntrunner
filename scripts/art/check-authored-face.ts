import { authoredDraculaFace } from '../../src/visual/creatures/v2/generated/draculaFaceV4';
import assert from 'node:assert/strict';
let triangles=0;
for(const part of authoredDraculaFace){
 assert.equal(part.position.length,part.normal.length,part.name);
 assert.equal(part.uv.length/2,part.position.length/3,part.name);
 if(part.color.length)assert.equal(part.color.length,part.position.length,part.name);
 for(let i=0;i<part.normal.length;i+=3)assert.ok(Math.abs(Math.hypot(...part.normal.slice(i,i+3))-1)<.001,`${part.name} normal ${i}`);
 for(let i=0;i<part.position.length;i+=9){
  const p=part.position;
  const ax=p[i+3]-p[i],ay=p[i+4]-p[i+1],az=p[i+5]-p[i+2];
  const bx=p[i+6]-p[i],by=p[i+7]-p[i+1],bz=p[i+8]-p[i+2];
  assert.ok(Math.hypot(ay*bz-az*by,az*bx-ax*bz,ax*by-ay*bx)>1e-12,`${part.name} degenerate ${i}`);
 }
 triangles+=part.position.length/9;
}
assert.ok(triangles<=6000);
console.log(`PASS exact authored face buffers: ${triangles} triangles, finite unit normals, matching UV/color and no zero-area triangles`);
