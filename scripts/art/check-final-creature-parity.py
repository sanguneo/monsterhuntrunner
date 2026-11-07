"""Compare official exports to Library-backed frozen review exports (offline evidence)."""
from pathlib import Path
import hashlib
import json
import struct

root = Path('.art')
review_roots = ['creature-v2/school-final27', 'zombie-lab-runtime-v4',
                'sea-skull-v2-current-aquatic5', 'sea-skull-v2-current-skull5',
                'creature-v2/castle-final-five']

def unpack(path):
    data = path.read_bytes()
    length = struct.unpack_from('<I', data, 12)[0]
    return json.loads(data[20:20+length]), data[20+length:]

report = {}
for review_root in review_roots:
    for reviewed in (root / review_root).glob('*.glb'):
        official = root / 'final' / reviewed.name
        before, binary_before = unpack(reviewed)
        after, binary_after = unpack(official)
        assert binary_before == binary_after, (reviewed, 'Binary payload differs')
        changes = []
        assert len(before['nodes']) == len(after['nodes'])
        for index, (left, right) in enumerate(zip(before['nodes'], after['nodes'])):
            old_extras, new_extras = left.pop('extras', {}), right.pop('extras', {})
            for key in set(old_extras) | set(new_extras):
                if old_extras.get(key) != new_extras.get(key):
                    assert key in {'creatureRevision', 'identity', 'zombieLabAuthoredMaterials'}, (reviewed, key)
                    changes.append({'node': index, 'field': 'extras.'+key,
                                    'reviewed': old_extras.get(key), 'official': new_extras.get(key)})
            if left.get('name') != right.get('name'):
                assert left.get('name') == 'v2-' + reviewed.stem and right.get('name') == reviewed.stem
                changes.append({'node': index, 'field': 'name', 'reviewed': left['name'], 'official': right['name']})
                left['name'] = right['name']
        assert before == after, (reviewed, 'Nonmetadata content differs')
        old_sha = hashlib.sha256(reviewed.read_bytes()).hexdigest()
        new_sha = hashlib.sha256(official.read_bytes()).hexdigest()
        report[reviewed.stem] = {'reviewedRoot': review_root, 'reviewedSha256': old_sha,
            'officialSha256': new_sha, 'byteIdentical': old_sha == new_sha,
            'geometryMaterialsImagesBinaryExact': True, 'metadataOnlyChanges': changes}
assert len(report) == 30, len(report)
(root / 'final-reviewed-creature-parity.json').write_text(json.dumps(report, indent=2))
print('PASS all30 exact geometry/material/image binary payloads; byte-identical containers:',
      sum(item['byteIdentical'] for item in report.values()), '; others only recorded facade metadata/name')
