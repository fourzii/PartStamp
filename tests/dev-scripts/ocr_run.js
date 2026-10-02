const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright');
const fs=require('fs');
(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage();
  await pg.goto('file://'+process.cwd()+'/ocrtest/blank.html');
  await pg.addScriptTag({path:'miniocr.js'});
  await pg.evaluate(()=>{ window.MiniOCR = MiniOCR; });
  const files=fs.readdirSync('ocrtest').filter(f=>f.endsWith('.png')).sort();
  const res={}; const t0=Date.now();
  for(const f of files){
    res['ocrtest/'+f]=await pg.evaluate(async(src)=>{ const im=new Image(); im.src=src; await im.decode(); const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; c.getContext('2d').drawImage(im,0,0); return MiniOCR.readImage(c); }, 'data:image/png;base64,'+fs.readFileSync('ocrtest/'+f).toString('base64'));
  }
  console.log('time per page', ((Date.now()-t0)/files.length).toFixed(0),'ms');
  fs.writeFileSync('ocrtest/mini.json',JSON.stringify(res));
  await b.close();
})();
