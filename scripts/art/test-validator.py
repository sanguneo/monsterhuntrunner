"""Negative controls for the GLB checks; only disposable copies are mutated."""
import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile

fixture = Path(sys.argv[1] if len(sys.argv) > 1 else '.art/final/hunter.glb')
original = fixture.read_bytes()
json_size = struct.unpack_from('<I', original, 12)[0]
doc = json.loads(original[20:20 + json_size])
bin_start = 20 + json_size + 8
primitives = [p for mesh in doc['meshes'] for p in mesh['primitives']]
primitive = next((p for p in primitives if 'indices' in p), primitives[0])
def accessor_offset(index):
    accessor = doc['accessors'][index]
    view = doc['bufferViews'][accessor['bufferView']]
    return bin_start + view.get('byteOffset', 0) + accessor.get('byteOffset', 0)

cases = {'valid': original}
bad = bytearray(original); bad[0] ^= 1; cases['bad-magic'] = bad
bad = bytearray(original); struct.pack_into('<I', bad, 8, len(bad) + 4); cases['bad-length'] = bad
bad = bytearray(original); struct.pack_into('<f', bad, accessor_offset(primitive['attributes']['POSITION']), float('nan')); cases['nan-position'] = bad
bad = bytearray(original); struct.pack_into('<fff', bad, accessor_offset(primitive['attributes']['NORMAL']), 0, 0, 0); cases['zero-normal'] = bad
if 'indices' in primitive:
    index = primitive['indices']; component = doc['accessors'][index]['componentType']
    fmt, maximum = {5121: ('B', 255), 5123: ('H', 65535), 5125: ('I', 4294967295)}[component]
    bad = bytearray(original); struct.pack_into('<' + fmt, bad, accessor_offset(index), maximum); cases['bad-index'] = bad

# Rebuild the JSON chunk so the malformed accessor is structurally well-formed GLB.
wrong_counts = json.loads(json.dumps(doc))
wrong_counts['accessors'][primitive['attributes']['NORMAL']]['count'] -= 1
chunk = json.dumps(wrong_counts, separators=(',', ':')).encode()
chunk += b' ' * (-len(chunk) % 4)
tail = original[20 + json_size:]
cases['attribute-count-mismatch'] = struct.pack('<III', 0x46546c67, 2, 20 + len(chunk) + len(tail)) + struct.pack('<II', len(chunk), 0x4e4f534a) + chunk + tail

validator = Path(__file__).with_name('validate-glb.py').resolve()
with tempfile.TemporaryDirectory(prefix='runner-glb-controls-') as temporary:
    root = Path(temporary)
    for name, data in cases.items():
        (root / 'control.glb').write_bytes(data)
        result = subprocess.run([sys.executable, str(validator), str(root)], capture_output=True, text=True)
        expected_success = name == 'valid'
        if (result.returncode == 0) != expected_success:
            raise AssertionError(f'{name}: unexpected validator outcome\n{result.stdout}\n{result.stderr}')
assert fixture.read_bytes() == original, 'Original fixture unexpectedly changed'
print(f'PASS: {len(cases)} GLB validator positive/negative controls; original fixture unchanged')
