import './export-texture-support';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { buildKrakenAuthoringSource } from '../../src/visual/creatures/v2/sea';

const out = '.art/kraken-authored';
mkdirSync(out, { recursive: true });
const data = await new GLTFExporter().parseAsync(buildKrakenAuthoringSource(), { binary: true });
writeFileSync(`${out}/kraken-authoring-input.glb`, Buffer.from(data as ArrayBuffer));
