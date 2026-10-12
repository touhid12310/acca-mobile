import numpy as np
def label(mask):
    # simple 8-connected component labelling via union-find on runs (numpy only)
    h,w=mask.shape; lab=np.zeros((h,w),np.int32); parent=[0]; nxt=1
    def find(a):
        while parent[a]!=a:
            parent[a]=parent[parent[a]]; a=parent[a]
        return a
    for y in range(h):
        row=mask[y]; x=0
        while x<w:
            if not row[x]: x+=1; continue
            x0=x
            while x<w and row[x]: x+=1
            x1=x  # run [x0,x1)
            ids=set()
            if y>0:
                lo=max(0,x0-1); hi=min(w,x1+1)
                prev=lab[y-1,lo:hi]; ids={int(i) for i in np.unique(prev) if i}
            if ids:
                roots={find(i) for i in ids}; r=min(roots)
                for o in roots: parent[o]=r
                lab[y,x0:x1]=r
            else:
                parent.append(nxt); lab[y,x0:x1]=nxt; nxt+=1
    # flatten
    roots=np.array([find(i) for i in range(len(parent))])
    lab=roots[lab]
    u=np.unique(lab); u=u[u>0]; remap=np.zeros(lab.max()+1,np.int32)
    for k,v in enumerate(u,1): remap[v]=k
    return remap[lab], len(u)
