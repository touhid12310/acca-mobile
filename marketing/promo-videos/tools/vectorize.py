import sys, numpy as np, potrace
from PIL import Image
sys.path.insert(0, sys.argv[0].rsplit('/',1)[0])
from scipy_free_label import label

SCALE=3
def trace(mask):
    bm=potrace.Bitmap(~mask)
    plist=bm.trace(turdsize=8, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=1.0, opticurve=True, opttolerance=0.2)
    parts=[]
    for curve in plist:
        fs=curve.start_point; parts.append(f"M{fs.x/SCALE:.2f},{fs.y/SCALE:.2f}")
        for seg in curve.segments:
            if seg.is_corner:
                parts.append(f"L{seg.c.x/SCALE:.2f},{seg.c.y/SCALE:.2f}L{seg.end_point.x/SCALE:.2f},{seg.end_point.y/SCALE:.2f}")
            else:
                parts.append(f"C{seg.c1.x/SCALE:.2f},{seg.c1.y/SCALE:.2f} {seg.c2.x/SCALE:.2f},{seg.c2.y/SCALE:.2f} {seg.end_point.x/SCALE:.2f},{seg.end_point.y/SCALE:.2f}")
        parts.append("Z")
    return "".join(parts)

def upmask(cov):
    # cov: float 0..1 coverage at native res -> smooth upscale then threshold
    im=Image.fromarray((cov*255).astype(np.uint8)).resize((cov.shape[1]*SCALE,cov.shape[0]*SCALE),Image.BICUBIC)
    return np.array(im)>127

def grad_fit(rgb, m):
    ys,xs=np.nonzero(m); cols=rgb[ys,xs].astype(float)
    A=np.c_[xs,ys,np.ones_like(xs)]
    coef=[np.linalg.lstsq(A,cols[:,c],rcond=None)[0] for c in range(3)]
    g=np.array([coef[1][0],coef[1][1]])  # green channel carries the ramp
    if np.linalg.norm(g)<1e-6: g=np.array([1.0,0])
    d=g/np.linalg.norm(g)
    t=xs*d[0]+ys*d[1]; tmin,tmax=np.percentile(t,0.5),np.percentile(t,99.5)
    def col(tv):
        # average actual colour of pixels near projection tv
        sel=np.abs(t-tv)<max(2,(tmax-tmin)*0.03)
        c=cols[sel].mean(0) if sel.any() else cols.mean(0)
        return '#%02x%02x%02x'%tuple(int(round(v)) for v in np.clip(c,0,255))
    cx,cy=xs.mean(),ys.mean(); c0=cx*d[0]+cy*d[1]
    p1=(cx+(tmin-c0)*d[0], cy+(tmin-c0)*d[1]); p2=(cx+(tmax-c0)*d[0], cy+(tmax-c0)*d[1])
    return p1,p2,col(tmin),col(tmax)

def run(src, out_prefix, dark_letters=True):
    im=Image.open(src).convert('RGBA'); a=np.array(im).astype(float)
    rgb=a[...,:3]; alpha=a[...,3]/255
    if alpha.min()>0.99:  # no transparency: derive coverage from distance to white
        alpha=np.clip((255-rgb.min(-1))/200,0,1)
    r,g,b=rgb[...,0],rgb[...,1],rgb[...,2]
    blue=(b-r>120)&(alpha>0.5)
    lum=0.3*r+0.59*g+0.11*b
    letters=(~blue)&(alpha>0.5)&((lum<110) if dark_letters else (lum>150))
    H,W=blue.shape
    svg_parts=[]; defs=[]
    # blue components each with own gradient
    lab,n=label(blue)
    for k in range(1,n+1):
        m=lab==k
        if m.sum()<200: continue
        cov=m.astype(float)*alpha
        # soften edge coverage using alpha around component
        d=trace(upmask(cov))
        p1,p2,c1,c2=grad_fit(rgb,m)
        gid=f"g{k}"
        defs.append(f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{p1[0]:.1f}" y1="{p1[1]:.1f}" x2="{p2[0]:.1f}" y2="{p2[1]:.1f}"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>')
        svg_parts.append(f'<path class="blue" fill="url(#{gid})" d="{d}"/>')
        print('component',k,m.sum(),c1,c2)
    if letters.any():
        d=trace(upmask(letters.astype(float)*alpha))
        svg_parts.append(f'<path class="letters" fill="currentColor" d="{d}"/>')
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><defs>{"".join(defs)}</defs>{"".join(svg_parts)}</svg>'
    open(out_prefix+'.svg','w').write(svg); print('wrote',out_prefix+'.svg',len(svg))

if __name__=='__main__' and len(sys.argv)<=4:
    run(sys.argv[1], sys.argv[2], sys.argv[3]=='dark' if len(sys.argv)>3 else True)

def run_parts(src, prefix, out):
    """Per-component tracing: every connected shape gets its own <path> (holes kept) with a class + data-cx."""
    im=Image.open(src).convert('RGBA'); a=np.array(im).astype(float)
    rgb=a[...,:3]; alpha=a[...,3]/255
    if alpha.min()>0.99: alpha=np.clip((255-rgb.min(-1))/200,0,1)
    r,g,b=rgb[...,0],rgb[...,1],rgb[...,2]
    blue=(b-r>120)&(alpha>0.5)
    lum=0.3*r+0.59*g+0.11*b
    letters=(~blue)&(alpha>0.5)&(lum<110)
    H,W=blue.shape; defs=[]; paths=[]
    for kind,mask in (('blue',blue),('letter',letters)):
        lab,n=label(mask)
        for k in range(1,n+1):
            m=lab==k
            if m.sum()<200: continue
            ys,xs=np.nonzero(m); cx=xs.mean()
            # include enclosed holes: fill holes by labelling background inside bbox
            d=trace(upmask(m.astype(float)*alpha))
            if kind=='blue':
                p1,p2,c1,c2=grad_fit(rgb,m); gid=f"{prefix}g{len(defs)+1}"
                defs.append(f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{p1[0]:.1f}" y1="{p1[1]:.1f}" x2="{p2[0]:.1f}" y2="{p2[1]:.1f}"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>')
                fill=f'url(#{gid})'
            else: fill='currentColor'
            paths.append((cx,kind,fill,d,xs.min(),xs.max()))
    paths.sort()
    body=[]
    for i,(cx,kind,fill,d,x0,x1) in enumerate(paths):
        body.append(f'<path class="p {kind}" data-i="{i}" data-cx="{cx:.0f}" fill="{fill}" d="{d}"/>')
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}"><defs>{"".join(defs)}</defs>{"".join(body)}</svg>'
    open(out,'w').write(svg); print(out,[(int(p[0]),p[1]) for p in paths])

if __name__=='__main__' and len(sys.argv)>4 and sys.argv[4]=='parts':
    run_parts(sys.argv[1], sys.argv[3], sys.argv[2])
