/** Export-only PNG bridge for THREE.DataTexture. No browser polyfill or runtime dependency.
 * Deliberately supports exact RGBA pixel export, not an emulated general DOM/canvas.
 * Packed ORM maps must be the same texture instance for metalness and roughness.
 */
import sharp from 'sharp';

// Serialize image completion so GLTFExporter allocates PNG bufferViews deterministically.
// Parallel sharp encodes otherwise reorder byte layout despite identical semantic image data.
let pngQueue: Promise<void> = Promise.resolve();

class ExportImageData {
  constructor(
    public data: Uint8ClampedArray,
    public width: number,
    public height: number,
  ) {}
}
class ExportCanvas {
  private w: number;
  private h: number;
  private pixels: Uint8ClampedArray;
  constructor(width: number, height: number) {
    this.w = width;
    this.h = height;
    this.pixels = new Uint8ClampedArray(width * height * 4);
  }
  get width() {
    return this.w;
  }
  set width(value: number) {
    this.w = value;
    this.pixels = new Uint8ClampedArray(this.w * this.h * 4);
  }
  get height() {
    return this.h;
  }
  set height(value: number) {
    this.h = value;
    this.pixels = new Uint8ClampedArray(this.w * this.h * 4);
  }
  getContext(type: string) {
    if (type !== '2d') throw new Error('Art export supports only 2D RGBA image encoding');
    return {
      // Canvas putImageData ignores transforms by specification; DataTexture exporter uses that path.
      translate: () => undefined,
      scale: () => undefined,
      putImageData: (image: ExportImageData, x: number, y: number) => {
        if (x !== 0 || y !== 0 || image.width !== this.w || image.height !== this.h)
          throw new Error('Art texture export requires exact unscaled RGBA dimensions');
        this.pixels.set(image.data);
      },
      drawImage: () => {
        throw new Error('Use DataTexture RGBA pixels, not HTML images, in headless art export');
      },
      fillRect: () => {
        throw new Error('Use one packed ORM texture for both roughnessMap and metalnessMap');
      },
    };
  }
  async convertToBlob(options: { type?: string }) {
    if (options.type && options.type !== 'image/png') throw new Error('Art texture export only writes lossless PNG');
    const pixels = Buffer.from(this.pixels),
      width = this.w,
      height = this.h;
    const task = pngQueue.then(async () => {
      const png = await sharp(pixels, { raw: { width, height, channels: 4 } })
        .png()
        .toBuffer();
      return new Blob([new Uint8Array(png)], { type: 'image/png' });
    });
    pngQueue = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  }
}
class ExportFileReader {
  result: ArrayBuffer | string | null = null;
  onloadend?: () => void;
  readAsArrayBuffer(blob: Blob) {
    void blob.arrayBuffer().then((value) => {
      this.result = value;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob: Blob) {
    void blob.arrayBuffer().then((value) => {
      this.result = `data:${blob.type};base64,${Buffer.from(value).toString('base64')}`;
      this.onloadend?.();
    });
  }
}
Object.assign(globalThis, { OffscreenCanvas: ExportCanvas, ImageData: ExportImageData });
if (typeof globalThis.FileReader === 'undefined') Object.assign(globalThis, { FileReader: ExportFileReader });
