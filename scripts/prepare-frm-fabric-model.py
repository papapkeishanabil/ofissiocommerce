"""Prepare the inspected white FRM mesh (Python standard library only).

Usage: python scripts/prepare-frm-fabric-model.py "path/to/original.glb"
Fabric and buttons both follow the selected color on this prepared model.
Textures, UVs, normals and triangle positions are preserved byte for byte.
"""
import argparse,json,struct,hashlib
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('source',type=Path)
parser.add_argument('--output',type=Path,default=Path('artifacts/3d/FRM-fabric-recolor.glb'))
args=parser.parse_args()
source=args.source
if args.output.resolve() == source.resolve():
 raise SystemExit('Choose a different output path; the original model must be preserved.')
data=source.read_bytes()
if hashlib.sha256(data).hexdigest()!='ba47882776dc0b4ec27e5bc8dc56df1a3058639f73d5a6c8c87500c89ce949fd':
 raise SystemExit('This mask only supports the inspected white FRM model. Source SHA256 differs.')
n=struct.unpack_from('<I',data,12)[0]
doc=json.loads(data[20:20+n]);binary=data[28+n:]
mesh=doc['meshes'][0]['primitives'][0]
vertex_count=doc['accessors'][mesh['attributes']['POSITION']]['count']
# The customer confirmed that buttons match the selected fabric color.
# A full-weight mask recolors the complete neutral garment, including buttons.
rgba=b'\xff'*(vertex_count*4)
binary+=b'\0'*((-len(binary))%4);offset=len(binary);binary+=rgba
doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(rgba),'target':34962})
doc['accessors'].append({'bufferView':len(doc['bufferViews'])-1,'componentType':5121,'normalized':True,'count':vertex_count,'type':'VEC4'})
mesh['attributes']['COLOR_0']=len(doc['accessors'])-1
doc['materials'][mesh['material']].setdefault('extras',{})['ofissioFabricRecolor']={'version':1,'mask':'vertex-alpha'}
doc['buffers'][0]['byteLength']=len(binary)
doc['asset'].setdefault('extras',{})['ofissioPreparation']={'sourceSha256':hashlib.sha256(data).hexdigest(),'protectedButtons':0,'buttonsFollowFabric':True,'note':'Fabric mask is specific to this inspected model. RGB textures, geometry and UVs are unchanged.'}
j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*((-len(j))%4);binary+=b'\0'*((-len(binary))%4)
out=args.output;out.parent.mkdir(parents=True,exist_ok=True)
out.write_bytes(struct.pack('<III',0x46546c67,2,28+len(j)+len(binary))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(binary),0x004e4942)+binary)
report={'file':str(out),'bytes':out.stat().st_size,'sourceSha256':hashlib.sha256(data).hexdigest(),'preparedSha256':hashlib.sha256(out.read_bytes()).hexdigest(),'buttonsFollowFabric':True,'vertices':vertex_count,'protectedVertices':0}
(out.parent/'FRM-preparation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
