/** Reconstruct the original eight-module stage from the untouched exact baseline GLB.
 * No baseline geometry is regenerated through newer authoring code. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { WORLDS } from '../../src/data/worlds';
class Reader {
  result: ArrayBuffer | string | null = null;
  onloadend?: () => void;
  readAsArrayBuffer(b: Blob) {
    b.arrayBuffer().then((a) => {
      this.result = a;
      this.onloadend?.();
    });
  }
  readAsDataURL(b: Blob) {
    b.arrayBuffer().then((a) => {
      this.result = 'data:application/octet-stream;base64,' + Buffer.from(a).toString('base64');
      this.onloadend?.();
    });
  }
}
Object.assign(globalThis, { FileReader: Reader });
const out = '.art/world-baseline';
mkdirSync(out, { recursive: true });
const reports = [];
for (const world of WORLDS) {
  const bytes = readFileSync(`.art/baseline/world-${world.id}.glb`);
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  );
  const source = gltf.scene.children[0];
  source.position.set(0, 0, 0);
  const scene = new THREE.Scene();
  for (const z of [88, 104, -8, 8, 24, 40, 56, 72]) {
    const chunk = source.clone(true);
    chunk.position.z = z;
    scene.add(chunk);
  }
  for (const [width, y, color] of [
    [8, -0.025, world.theme.floor],
    [90, -0.07, world.theme.wallA],
  ]) {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(width, 240),
      new THREE.MeshStandardMaterial({ color, roughness: 0.95 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, y, 80);
    scene.add(floor);
  }
  let triangles = 0,
    draws = 0;
  scene.traverseVisible((o) => {
    if (o instanceof THREE.Mesh) {
      triangles += (o.geometry.index?.count ?? o.geometry.getAttribute('position').count) / 3;
      draws++;
    }
  });
  reports.push({ id: world.id, triangles, draws, bg: world.theme.bg });
  const data = await new GLTFExporter().parseAsync(scene, { binary: true });
  writeFileSync(`${out}/world-${world.id}.glb`, Buffer.from(data as ArrayBuffer));
}
writeFileSync(`${out}/inventory.json`, JSON.stringify(reports, null, 2));
