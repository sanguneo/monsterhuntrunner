"""Lossless little-endian Float32/Uint16 payloads for already-authored indexed geometry."""
import struct,base64
def pack_records(value):
 if isinstance(value,dict) and all(k in value for k in ['p','n','uv','i']):
  assert max(value['i'],default=0)<65536
  return {k:base64.b64encode(struct.pack('<'+('H' if k=='i' else 'f')*len(value[k]),*value[k])).decode() for k in ['p','n','uv','i']}
 if isinstance(value,dict):return {k:pack_records(v) for k,v in value.items()}
 if isinstance(value,list):return [pack_records(v) for v in value]
 return value
