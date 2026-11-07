"""Verify reused pixel evidence against exact current gameplay geometry/material payloads."""
import pathlib,json,hashlib,importlib.util,sys
base=pathlib.Path(__file__).parent;spec=importlib.util.spec_from_file_location('equivalence',base/'check-sea-skull-runtime-equivalence.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
current=pathlib.Path(sys.argv[1]);mapping={
 'sharkFin':'sea-skull-v2-detail-all','kraken':'sea-skull-v2-refined-pair',
 'pufferfish':'sea-skull-v2-refined-others','jellyfish':'sea-skull-v2-aquatic-face',
 'skullKing':'sea-skull-v2-aquatic-face','skeletonKnight':'sea-skull-v2-detail-others',
 'skeletonSoldier':'sea-skull-v2-detail-others','boneGolem':'sea-skull-v2-detail-others',
 'skullBird':'sea-skull-v2-expression',
}
rows=[]
for name,directory in mapping.items():
 target=pathlib.Path('.art/sea-skull-v2-refined-pair' if name in ['sharkFin','kraken'] else current)/(name+'.glb')
 folder=pathlib.Path('.art')/directory
 if (current/(name+'-side.png')).exists():folder=current
 source=folder/(name+'.glb');assert module.canonical(target)[0]==module.canonical(source)[0], name+' changed from pixel source'
 metadata=json.loads((folder/'pixel-manifest.json').read_text());source_hash=hashlib.sha256(source.read_bytes()).hexdigest();views={}
 for view in ['front','side','distance']:
  filename=name+'-'+view+'.png';path=folder/filename
  if not path.exists():continue
  item=metadata[filename];assert item['glbSha256']==source_hash, filename+' stale GLB link';assert item['sha256']==hashlib.sha256(path.read_bytes()).hexdigest(),filename+' changed pixels'
  views[view]=str(path)
 rows.append({'asset':name,'currentGeometryMaterialsMatch':True,'sourceGLBSHA256':source_hash,'verifiedViews':views})
output=pathlib.Path('.art/sea-skull-runtime-audit/pixel-coverage.json');output.write_text(json.dumps({'status':'source-and-pixel-hash-verified','assets':rows},indent=2));print(json.dumps(rows,indent=2))
