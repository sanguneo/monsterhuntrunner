import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
// Use Vitest's pinned vite-node dependency without depending on pnpm's store path.
const require = createRequire(import.meta.url);
const vitestRequire = createRequire(require.resolve('vitest/package.json'));
const runner = join(dirname(vitestRequire.resolve('vite-node/package.json')), 'vite-node.mjs');
const result = spawnSync(process.execPath, [runner, 'scripts/art/export.ts', process.argv[2] || '.art/final'], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
