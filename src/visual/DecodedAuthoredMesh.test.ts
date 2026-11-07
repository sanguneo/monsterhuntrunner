import { describe, expect, it } from 'vitest';
import { decodeAuthoredMeshes } from './creatures/v2/DecodedAuthoredMesh';

describe('lossless authored Float32 storage', () => {
  it('decodes exact IEEE-754 bytes into shared attribute views without altering them', () => {
    const values = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);
    const data = btoa(String.fromCharCode(...new Uint8Array(values.buffer)));
    const [mesh] = decodeAuthoredMeshes({
      data,
      parts: [{ name: 'triangle', position: [0, 9], normal: [9, 9], uv: [18, 6], color: [24, 0] }],
    });
    expect(new Uint8Array(mesh.position.buffer)).toEqual(new Uint8Array(values.buffer));
    expect(mesh.normal.buffer).toBe(mesh.position.buffer);
    expect(mesh.uv.buffer).toBe(mesh.position.buffer);
    expect(Array.from(mesh.uv)).toEqual([0, 0, 1, 0, 0, 1]);
  });
  it('rejects malformed storage rather than silently returning truncated geometry', () => {
    expect(() => decodeAuthoredMeshes({ data: 'AA==', parts: [] })).toThrow(/alignment/);
    expect(() =>
      decodeAuthoredMeshes({
        data: 'AAAAAA==',
        parts: [{ name: 'bad', position: [0, 9], normal: [0, 9], uv: [0, 6], color: [0, 0] }],
      }),
    ).toThrow(/bounds/);
  });
});
