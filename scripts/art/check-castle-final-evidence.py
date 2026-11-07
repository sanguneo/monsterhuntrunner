"""Verify exact current castle 15 asset views + 3 CameraController layout proofs.
Hash/coverage validation is not an aesthetic or WebGL/FPS certification.
Run from repository root; optionally pass an alternate .art/creature-v2 root.
"""
import hashlib
import json
import sys
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else '.art/creature-v2')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def read(path):
    return json.loads(path.read_text())

assets = root / 'castle-final-five'
scene = read(assets / 'creature-review.manifest.json')
pixels = read(assets / 'pixel-manifest.json')
ids = {'wolf', 'bat', 'ghoul', 'werewolfChief', 'dracula'}
views = {'front', 'side', 'distance'}
expected = {f'{asset}-{view}.png' for asset in ids for view in views}
assert set(pixels) == expected, 'Missing or unexpected asset proof entries'
assert set(scene['glbs']) == ids, 'Unexpected current castle model coverage'
assert sha(assets / 'creature-review.blend') == scene['blendSha256'], 'Changed asset review Blend'
for filename, row in pixels.items():
    assert row['asset'] in ids and row['view'] in views
    assert filename == f"{row['asset']}-{row['view']}.png"
    assert sha(assets / filename) == row['sha256'], filename
    assert sha(assets / f"{row['asset']}.glb") == row['glbSha256'] == scene['glbs'][row['asset']], filename
    assert row['blendSha256'] == scene['blendSha256'], filename

layouts = root / 'castle-final-runtime-layout'
scene = read(layouts / 'layout.manifest.json')
pixels = read(layouts / 'layout-pixel-manifest.json')
expected_modes = {'dracula-mobs': 'follow', 'dracula-werewolfChief': 'boss', 'dracula-dracula': 'boss'}
assert set(pixels) == {f'world-{name}.png' for name in expected_modes}, 'Missing or unexpected camera proofs'
assert set(scene['glbs']) == {f'world-{name}.glb' for name in expected_modes}
assert sha(layouts / 'layout-editable.blend') == scene['blendSha256'], 'Changed layout Blend'
inventory = {row['id']: row for row in read(layouts / 'inventory.json')}
assert set(inventory) == set(expected_modes)
for name, mode in expected_modes.items():
    filename = f'world-{name}.png'
    row = pixels[filename]
    assert row['cameraMode'] == inventory[name]['cameraMode'] == mode, filename
    assert sha(layouts / filename) == row['sha256'], filename
    assert sha(layouts / f'world-{name}.glb') == row['glbSha256'] == scene['glbs'][f'world-{name}.glb'], filename
    assert row['blendSha256'] == scene['blendSha256'], filename
print('PASS: exact castle15 asset views +3 CameraController layout proofs; PNG/GLB/packed Blend hashes and coverage')
