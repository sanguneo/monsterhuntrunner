"""Validate frozen school image-to-runtime provenance; not an aesthetic approval."""
import hashlib
import json
import sys
from pathlib import Path

models, layouts = map(Path, sys.argv[1:3])
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
model_scene = json.loads((models / 'creature-review.manifest.json').read_text())
layout_scene = json.loads((layouts / 'layout.manifest.json').read_text())
assert sha(models / 'creature-review.blend') == model_scene['blendSha256']
assert sha(layouts / 'layout-editable.blend') == layout_scene['blendSha256']
pixels = json.loads((models / 'pixel-manifest.json').read_text())
coverage = {}
for row in json.loads((models / 'inventory.json').read_text()):
    asset = row['id']
    digest = sha(models / (asset + '.glb'))
    assert digest == model_scene['glbs'][asset]
    views = []
    for filename, proof in pixels.items():
        if proof['asset'] != asset:
            continue
        assert proof['glbSha256'] == digest, filename
        assert sha(models / filename) == proof['sha256'], filename
        views.append(proof['view'])
    required = {'front', 'side', 'distance'}
    if asset == 'ghostGirl':
        required |= {'face-front','face-profile'}
    assert required <= set(views), (asset, required - set(views))
    coverage[asset] = {'glbSha256': digest, 'verifiedViews': sorted(views),
                       'triangles': row['triangles'], 'batches': row['draws']}
assert len(coverage) == 5
layout_pixels = json.loads((layouts / 'pixel-manifest.json').read_text())
scenes = {}
for row in json.loads((layouts / 'inventory.json').read_text()):
    scene = row['id']
    filename = 'world-' + scene
    digest = sha(layouts / (filename + '.glb'))
    assert digest == layout_scene['glbs'][filename + '.glb']
    proof = layout_pixels[filename + '.png']
    assert proof['glbSha256'] == digest
    assert sha(layouts / (filename + '.png')) == proof['sha256']
    scenes[scene] = proof
assert len(scenes) == 3
report = {'note': 'SHA-linked offline evidence only; not browser/FPS or appearance approval.',
          'models': coverage, 'actualCameraScenes': scenes}
(models / 'verified-final-proof-coverage.json').write_text(json.dumps(report, indent=2))
print('PASS: 5 exact runtime models, front/side/distance, two true anatomical face views and three actual-camera offline scenes; all image/GLB/Blend hashes verified')
