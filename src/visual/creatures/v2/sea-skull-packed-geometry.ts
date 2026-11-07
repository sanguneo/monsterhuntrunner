import * as THREE from 'three';
export interface PackedIndexedAnatomy {
  p: string;
  n: string;
  uv: string;
  i: string;
}
const decoded = new WeakMap<
  PackedIndexedAnatomy,
  { p: Float32Array; n: Float32Array; uv: Float32Array; i: Uint16Array }
>();
function bytes(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
function floats(s: string): Float32Array {
  const b = bytes(s);
  if (b.byteLength % 4) throw Error('Unaligned Float32 anatomy');
  const v = new DataView(b.buffer);
  return Float32Array.from({ length: b.byteLength / 4 }, (_, i) => v.getFloat32(i * 4, true));
}
/** Immutable decoded CPU source; each runtime geometry owns independent mutable buffers. */
export function createPackedIndexedAnatomy(source: PackedIndexedAnatomy): THREE.BufferGeometry {
  let a = decoded.get(source);
  if (!a) {
    const b = bytes(source.i);
    if (b.byteLength % 2) throw Error('Unaligned anatomy index');
    const v = new DataView(b.buffer);
    a = {
      p: floats(source.p),
      n: floats(source.n),
      uv: floats(source.uv),
      i: Uint16Array.from({ length: b.length / 2 }, (_, i) => v.getUint16(i * 2, true)),
    };
    if (
      a.p.length % 3 ||
      a.n.length !== a.p.length ||
      a.uv.length * 3 !== a.p.length * 2 ||
      a.i.length % 3 ||
      a.i.some((i) => i >= a!.p.length / 3) ||
      [...a.p, ...a.n, ...a.uv].some((v) => !Number.isFinite(v))
    )
      throw Error('Invalid packed authored anatomy');
    decoded.set(source, a);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(a.p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(a.n, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(a.uv, 2));
  g.setIndex(new THREE.BufferAttribute(a.i.slice(), 1));
  return g;
}
