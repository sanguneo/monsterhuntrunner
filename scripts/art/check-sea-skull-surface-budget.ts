import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { buildSeaMonster, buildSeaBoss } from '../../src/visual/creatures/v2/sea';
import { buildSkullMonster, buildSkullBoss } from '../../src/visual/creatures/v2/skull';
import { surfaceDetailStats, disposeSurfaceDetailCache } from '../../src/visual/creatures/v2/SurfaceDetail';
const ids = [
  'sharkFin',
  'pufferfish',
  'jellyfish',
  'kraken',
  'seaWitch',
  'boneGolem',
  'skeletonSoldier',
  'skullBird',
  'skeletonKnight',
  'skullKing',
];
for (const id of ids)
  assert.ok(buildSeaMonster(id, 0) || buildSeaBoss(id) || buildSkullMonster(id, 0) || buildSkullBoss(id));
const first = surfaceDetailStats();
assert.ok(first.estimatedMipBytes <= first.budgetBytes);
for (const id of ids)
  assert.ok(buildSeaMonster(id, 0) || buildSeaBoss(id) || buildSkullMonster(id, 0) || buildSkullBoss(id));
assert.deepEqual(surfaceDetailStats(), first);
writeFileSync(
  `${process.argv[2] || '.art/sea-skull-v2-current-others'}/texture-budget.json`,
  JSON.stringify({ status: 'ten-model-cache-reuse-pass', ...first }, null, 2),
);
disposeSurfaceDetailCache();
console.log('PASS ten-model shared texture reuse', first);
