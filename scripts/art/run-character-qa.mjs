import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import console from 'node:console';

// Keep Node-only artifact I/O outside the browser-typed test sources.
const require = createRequire(import.meta.url);
const runner = join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
const result = spawnSync(process.execPath, [runner, 'run', 'src/entities/HunterGeometry.test.ts',
  'src/entities/HunterGarment.test.ts', 'src/entities/HunterGroundContact.test.ts', 'src/entities/HunterAnatomy.test.ts', '--minWorkers=1', '--maxWorkers=2'], {
  encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
});
const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
const root = process.argv[2] || '.art/hunter-concept';
mkdirSync(root, { recursive: true });
writeFileSync(join(root, 'character-qa.log'), output);
let missing = false;
for (const [marker, file] of [['HUNTER_GARMENT_REPORT', 'garment-qa.json'], ['HUNTER_FACE_REPORT', 'face-qa.json'], ['HUNTER_GROUND_REPORT', 'ground-qa.json'], ['HUNTER_ANATOMY_REPORT', 'anatomy-qa.json']]) {
  const line = output.split('\n').find((entry) => entry.includes(`${marker} `));
  if (!line) { missing = true; console.error(`Missing ${marker}; see ${root}/character-qa.log`); continue; }
  const report = JSON.parse(line.slice(line.indexOf(`${marker} `) + marker.length + 1));
  writeFileSync(join(root, file), JSON.stringify(report, null, 2));
  console.log(`Saved ${file}; actual rendered-pixel review remains required.`);
}
if (result.error) console.error(result.error.message);
process.stdout.write(output.split('\n').filter((line) => !line.includes('HUNTER_GARMENT_REPORT') && !line.includes('HUNTER_FACE_REPORT') && !line.includes('HUNTER_GROUND_REPORT') && !line.includes('HUNTER_ANATOMY_REPORT')).slice(-20).join('\n'));
process.exit(result.status === 0 && !missing ? 0 : (result.status || 1));
