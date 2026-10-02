import json, subprocess, sys, glob, os
from concurrent.futures import ThreadPoolExecutor
pdf, sj, dirn = sys.argv[1:4]
D=json.load(open(sj)); ocr=D.get('ocr',{})
pages=[i for i in (D['todo'] if len(sys.argv)<5 else [int(x)-1 for x in sys.argv[4].split(',')]) if str(i) not in ocr]
def read(i):
    p=i+1; base=f'{dirn}/k{p}'
    subprocess.run(['pdftoppm','-f',str(p),'-l',str(p),'-r','165','-x','0','-y','0','-W','772','-H','261','-gray',pdf,base],capture_output=True)
    img=sorted(glob.glob(base+'-*.pgm'))[0]
    return i, subprocess.run(['tesseract',img,'-'],capture_output=True,text=True).stdout
with ThreadPoolExecutor(4) as ex:
    for i,t in ex.map(read,pages): ocr[str(i)]=t
D['ocr']=ocr; json.dump(D,open(sj,'w')); print('read',len(pages),'pages')
