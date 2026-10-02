import pypdf, json, sys, warnings; warnings.filterwarnings("ignore")
f=sys.argv[1]; out=sys.argv[2]
r=pypdf.PdfReader(f)
def refs(res,name):
    d=res.get(name)
    if d is None: return ""
    d=d.get_object()
    return ",".join(sorted(f"{k}={getattr(d.raw_get(k),'idnum',d.raw_get(k))}" for k in d.keys()))
keys=[]
for p in r.pages:
    c=p.get('/Contents'); c=c.get_object() if c is not None else None
    raw=b''.join(x.get_object()._data for x in c) if isinstance(c,pypdf.generic.ArrayObject) else (c._data if c is not None else b'')
    res=p['/Resources']
    keys.append((raw, refs(res,'/XObject'), refs(res,'/Font'), p.get('/Rotate',0), tuple(p.mediabox)))
first={}; rep=[first.setdefault(k,i) for i,k in enumerate(keys)]
json.dump({'N':len(rep),'rep':rep},open(out,'w')); print('pages',len(rep),'unique',len(set(rep)))
