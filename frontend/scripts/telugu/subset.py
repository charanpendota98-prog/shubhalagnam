import argparse,hashlib,json,tempfile
from pathlib import Path
import fontTools
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset
p=argparse.ArgumentParser();p.add_argument('source_ttf',type=Path);a=p.parse_args()
r=Path(__file__).resolve().parents[2];m=json.loads(Path(__file__).with_name('manifest.json').read_text())
assert fontTools.__version__==m['fonttools']
assert hashlib.sha256(a.source_ttf.read_bytes()).hexdigest()==m['source_sha256']
f=instantiateVariableFont(TTFont(a.source_ttf),{'wdth':100,'wght':(100,900)},inplace=True)
# Round-trip to materialize lazy variation tables before subsetting.
with tempfile.TemporaryDirectory() as d:
 t=Path(d)/'instanced.ttf';f.save(t);f=TTFont(t)
 o=subset.Options();o.flavor='woff2';o.layout_features=['*'];o.recalc_bounds=True
 s=subset.Subsetter(options=o);s.populate(unicodes=list(range(0xc00,0xc80))+[0x20,0x200c,0x200d]);s.subset(f);f.flavor='woff2'
 output=r/'public/icons/fonts/manavivaha-telugu-v1.woff2';f.save(output)
 assert sorted(f.getBestCmap())==m['cmap']
 assert hashlib.sha256(output.read_bytes()).hexdigest()==m['output_sha256']
 print('Pinned Telugu subset reproduced',output.stat().st_size)
