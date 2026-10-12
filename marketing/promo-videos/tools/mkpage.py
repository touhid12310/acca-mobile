"""Generate videos/<id>/index.html (shared shell) for each video that has a video.js."""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHELL = """<!doctype html><html><head><meta charset="utf-8"><title>{id}</title>
<link rel="stylesheet" href="../../lib/common.css">
<script src="../../node_modules/gsap/dist/gsap.min.js"></script><script src="../../node_modules/topojson-client/dist/topojson-client.min.js"></script>
<script type="importmap">{{"imports":{{"three":"../../node_modules/three/build/three.module.js","three/addons/":"../../node_modules/three/examples/jsm/"}}}}</script>
<script src="../../lib/brand.js"></script><script src="../../lib/icons.js"></script>
<script>window.VO=[];</script><script src="../../out/{id}/vo.js"></script>
</head><body><div id="stage"></div>
<script src="../../lib/engine.js"></script><script src="../../lib/kit.js"></script><script src="../../lib/ui.js"></script>
<script {mod}src="video.js"></script>
</body></html>
"""
for vid in sorted(os.listdir(os.path.join(ROOT, 'videos'))):
    d = os.path.join(ROOT, 'videos', vid)
    js = os.path.join(d, 'video.js')
    if not os.path.exists(js): continue
    mod = 'type="module" ' if 'import ' in open(js).read()[:400] else ''
    open(os.path.join(d, 'index.html'), 'w').write(SHELL.format(id=vid, mod=mod))
    print('page', vid)
