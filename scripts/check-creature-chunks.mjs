import process from 'node:process';
import console from 'node:console';
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
const root = process.argv[2] ?? 'dist';
const manifest = JSON.parse(readFileSync(`${root}/.vite/manifest.json`, 'utf8'));
const closure = (key, found = new Set()) => {
  if (found.has(key)) return found;
  assert(manifest[key], `Missing manifest dependency ${key}`);
  found.add(key);
  for (const child of manifest[key].imports ?? []) closure(child, found);
  return found;
};
const stat = (keys) => {
  const files = [...new Set([...keys].map((key) => manifest[key].file))].filter((file) => file.endsWith('.js'));
  return {
    files,
    bytes: files.reduce((n, file) => n + readFileSync(`${root}/${file}`).length, 0),
    gzipBytes: files.reduce((n, file) => n + gzipSync(readFileSync(`${root}/${file}`)).length, 0),
  };
};
const entry = Object.keys(manifest).find((key) => manifest[key].isEntry);
assert(entry, 'No app entry');
const initialKeys = closure(entry),
  initial = stat(initialKeys);
const worlds = ['school', 'zombie', 'lab', 'sea', 'dracula', 'skull'];
const keys = Object.fromEntries(
  worlds.map((world) => {
    const key = Object.keys(manifest).find((k) => k.endsWith(`/creatures/v2/${world}.ts`));
    assert(key && manifest[key].isDynamicEntry, `${world} must be a dynamic theme entry`);
    assert(!initialKeys.has(key), `${world} is eagerly imported by boot`);
    return [world, key];
  }),
);
const themes = {};
for (const world of worlds) {
  const dependencies = closure(keys[world]);
  for (const other of worlds)
    if (other !== world) assert(!dependencies.has(keys[other]), `${world} eagerly loads ${other}`);
  const incremental = new Set([...dependencies].filter((key) => !initialKeys.has(key)));
  themes[world] = {
    incremental: stat(incremental),
    firstPlayableVisitIncludingApp: stat(new Set([...initialKeys, ...dependencies])),
  };
}
assert(initial.bytes <= 850_000, `Initial JS ${initial.bytes} exceeds 850KB regression guard`);
assert(initial.gzipBytes <= 230_000, `Initial gzip ${initial.gzipBytes} exceeds 230KB regression guard`);
assert(
  themes.school.firstPlayableVisitIncludingApp.gzipBytes <= 1_000_000,
  'Default playable-school closure exceeds 1MB gzip',
);
for (const world of worlds) {
  themes[world].incrementalAfterVisitedWorld = {};
  for (const prior of worlds) {
    const cached = new Set([...initialKeys, ...closure(keys[prior])]);
    themes[world].incrementalAfterVisitedWorld[prior] = stat(
      new Set([...closure(keys[world])].filter((key) => !cached.has(key))),
    );
  }
}
const report = {
  note: 'Actual emitted JS and per-file gzip sums. Includes static dependency closure, excludes HTTP overhead, CSS and browser compilation/FPS. Async world visits add only not-yet-cached files. School is the existing non-persisted default.',
  initial,
  themes,
};
writeFileSync(`${root}/creature-chunk-budget.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
