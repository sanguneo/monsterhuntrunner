"""Exercise the actual hunter render handoff without rendering, using disposable copies.
Requires Blender and a current directory prepared by review.py.
"""
from pathlib import Path
import hashlib
import shutil
import subprocess
import sys
import tempfile

root = Path(sys.argv[1] if len(sys.argv) > 1 else '.art/hunter-concept').resolve()
renderer = Path(__file__).with_name('render-hunter-hero.py').resolve()
original_hashes = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in root.iterdir()
                   if p.suffix in ['.glb', '.blend'] or p.name == 'runtime-review.manifest.json'}
with tempfile.TemporaryDirectory(prefix='runner-review-control-') as temporary:
    target = Path(temporary)
    for name in original_hashes:
        shutil.copyfile(root / name, target / name)
    def check(expected_success):
        result = subprocess.run(['blender', '-b', '-t', '2', '--python-exit-code', '1',
                                 '--python', str(renderer), '--', str(target), '--views=none'],
                                capture_output=True, text=True)
        assert (result.returncode == 0) == expected_success, result.stdout + result.stderr
    check(True)
    blend = target / 'runtime-review.blend'
    blend.write_bytes(blend.read_bytes() + b'stale-control')
    check(False)
    shutil.copyfile(root / blend.name, blend)
    glb = next(target.glob('*.glb'))
    glb.write_bytes(glb.read_bytes() + b'changed-input-control')
    check(False)
for name, digest in original_hashes.items():
    assert hashlib.sha256((root / name).read_bytes()).hexdigest() == digest
print('PASS: current review accepted; changed Blend and changed GLB both rejected; originals unchanged')
