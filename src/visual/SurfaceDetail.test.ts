import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  applySurfaceUV,
  createSurfaceMaterial,
  disposeSurfaceDetailCache,
  registerSurfaceSampler,
  surfaceDetailStats,
} from './creatures/v2/SurfaceDetail';

describe('real runtime PBR surface resources', () => {
  it('shares immutable maps, keeps correct color spaces/channel packing, and releases maps only at cache teardown', () => {
    registerSurfaceSampler('brocade/test-contract', (u, v) => ({
      color: [0.8 + 0.1 * Math.sin(u * Math.PI * 2), 0.9, 0.85],
      height: 0.01 * Math.sin(u * Math.PI * 12) * Math.cos(v * Math.PI * 8),
      roughness: 0.7 + 0.1 * Math.sin(v * Math.PI * 2),
      metalness: 0.25,
      occlusion: 0.95,
    }));
    const a = createSurfaceMaterial('brocade/test-contract');
    const b = createSurfaceMaterial('brocade/test-contract');
    const variant = createSurfaceMaterial('brocade/test-contract', { patternScale: 2 });
    expect(a).not.toBe(b);
    expect(a.map).toBe(b.map);
    expect(a.normalMap).toBe(b.normalMap);
    expect(a.roughnessMap).toBe(a.metalnessMap);
    expect(a.roughnessMap).toBe(a.aoMap);
    expect(a.map!.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(a.normalMap!.colorSpace).toBe(THREE.NoColorSpace);
    expect(a.roughnessMap!.colorSpace).toBe(THREE.NoColorSpace);
    expect(variant.map!.source).toBe(a.map!.source);
    expect(a.map!.repeat.x).toBe(1);
    expect(variant.map!.repeat.x).toBe(2);
    expect(surfaceDetailStats().uniqueImages).toBe(3);
    expect(surfaceDetailStats().rawPixelBytes).toBe(3 * 128 * 128 * 4);
    const data = (a.normalMap as THREE.DataTexture).image.data;
    for (let i = 0; i < data.length; i += 4) {
      const length = Math.hypot(data[i] / 127.5 - 1, data[i + 1] / 127.5 - 1, data[i + 2] / 127.5 - 1);
      expect(Math.abs(length - 1)).toBeLessThan(0.012);
      expect(data[i + 3]).toBe(255);
    }
    let released = 0;
    const textures = new Set([
      a.map!,
      a.normalMap!,
      a.roughnessMap!,
      variant.map!,
      variant.normalMap!,
      variant.roughnessMap!,
    ]);
    textures.forEach((texture) =>
      texture.addEventListener('dispose', () => {
        released++;
      }),
    );
    a.dispose();
    b.dispose();
    variant.dispose();
    expect(released).toBe(0); // Materials do not own the shared page-lifetime maps.
    disposeSurfaceDetailCache();
    expect(released).toBe(textures.size);
    expect(surfaceDetailStats().rawPixelBytes).toBe(0);
  });

  it('compacts only exactly uniform RGBA fields without changing any sampled values', () => {
    registerSurfaceSampler('paper/test-constant-field', () => ({
      color: [0.5, 0.25, 0.75],
      height: 0,
      roughness: 0.8,
      metalness: 0,
      occlusion: 1,
    }));
    const material = createSurfaceMaterial('paper/test-constant-field');
    for (const map of [material.map!, material.normalMap!, material.roughnessMap!]) {
      expect(map.image.width).toBe(1);
      expect(map.image.height).toBe(1);
      expect(map.generateMipmaps).toBe(false);
    }
    expect(Array.from((material.map as THREE.DataTexture).image.data)).toEqual([128, 64, 191, 255]);
    expect(Array.from((material.normalMap as THREE.DataTexture).image.data)).toEqual([128, 128, 255, 255]);
    expect(Array.from((material.roughnessMap as THREE.DataTexture).image.data)).toEqual([255, 204, 0, 255]);
    expect(surfaceDetailStats().rawPixelBytes).toBe(12);
    material.dispose();
    disposeSurfaceDetailCache();
  });

  it('supports explicitly budgeted detailed artwork without upscaling constant channels', () => {
    registerSurfaceSampler(
      'paper/test-detail',
      (u) => ({ color: [u, 0.25, 0.75], height: 0, roughness: 0.8, metalness: 0 }),
      256,
    );
    const material = createSurfaceMaterial('paper/test-detail');
    expect(material.map!.image.width).toBe(256);
    expect(material.map!.image.height).toBe(256);
    expect(material.normalMap!.image.width).toBe(1);
    expect(material.roughnessMap!.image.width).toBe(1);
    expect(surfaceDetailStats().rawPixelBytes).toBe(256 * 256 * 4 + 8);
    material.dispose();
    disposeSurfaceDetailCache();
  });

  it('scales real authored UVs without atlas wrapping discontinuities or topology changes', () => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const count = geometry.getAttribute('position').count;
    applySurfaceUV(geometry, 'velvet/test', 2, 3);
    const uv = geometry.getAttribute('uv');
    expect(Math.max(...Array.from({ length: uv.count }, (_, i) => uv.getX(i)))).toBe(2);
    expect(Math.max(...Array.from({ length: uv.count }, (_, i) => uv.getY(i)))).toBe(3);
    expect(geometry.getAttribute('position').count).toBe(count);
    geometry.deleteAttribute('uv');
    expect(() => applySurfaceUV(geometry, 'velvet')).toThrow('requires UV');
  });
});
