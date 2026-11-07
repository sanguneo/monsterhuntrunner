import * as THREE from 'three';
import { authoredDraculaFace } from '../../src/visual/creatures/v2/generated/draculaFaceV4';
const meshes = authoredDraculaFace.map(part => {
 const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(part.position,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(part.normal,3));
 const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.FrontSide}));m.name=part.name;m.updateMatrixWorld();return m;
});
const skin=meshes.find(x=>x.name==='authored-vampire-face')!;
for(const label of ['r','l']){
 const eye=meshes.find(x=>x.name==='anatomical-almond-sclera-'+label)!;
 const box=new THREE.Box3().setFromObject(eye),center=box.getCenter(new THREE.Vector3());const visible:THREE.Vector3[]=[];
 for(let x=center.x-.033;x<=center.x+.033;x+=.001)for(let y=2.925;y<=2.99;y+=.001){
  const ray=new THREE.Raycaster(new THREE.Vector3(x,y,-3),new THREE.Vector3(0,0,1));
  const e=ray.intersectObject(eye)[0],s=ray.intersectObject(skin)[0];
  if(e&&(!s||e.distance<s.distance-.00001))visible.push(e.point);
 }
 const b=new THREE.Box3().setFromPoints(visible);console.log(label,visible.length,'aperture center',b.getCenter(new THREE.Vector3()).toArray(),'bounds',b.min.toArray(),b.max.toArray());
}
