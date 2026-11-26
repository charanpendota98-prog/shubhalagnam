import argparse
import hashlib
import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset

# Research build pinned source and explicit inventory, never downloads at runtime.
p = argparse.ArgumentParser()
p.add_argument('source_ttf', type=Path)
a = p.parse_args()
root = Path(__file__).resolve().parents[2]
manifest = json.loads((Path(__file__).with_name('manifest.json')).read_text())
assert hashlib.sha256(a.source_ttf.read_bytes()).hexdigest() == manifest['source_sha256']
f = TTFont(a.source_ttf)
if 'SVG ' in f: del f['SVG ']
options = subset.Options()
options.layout_features = ['*']
options.name_IDs = ['*']
options.name_legacy = True
s = subset.Subsetter(options=options)
s.populate(unicodes=manifest['subset_input_codepoints'])
s.subset(f)
f.flavor = 'woff2'
output = root / 'public/icons/fonts/manavivaha-emoji-v1.woff2'
f.save(output)
assert hashlib.sha256(output.read_bytes()).hexdigest() == manifest['output_sha256']
print('Pinned emoji subset reproduced:', output.stat().st_size, 'bytes')
