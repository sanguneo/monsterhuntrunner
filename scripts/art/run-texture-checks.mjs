import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve('vitest/package.json'));
const runner = join(dirname(vitestRequire.resolve('vite-node/package.json')), 'vite-node.mjs');
for (const check of ['check-texture-export.ts', 'check-texture-determinism.ts']) {
  const result = spawnSync(process.execPath, [runner, `scripts/art/${check}`], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
