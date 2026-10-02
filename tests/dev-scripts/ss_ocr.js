const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright');
const fs=require('fs');
(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage();
  await pg.goto('file://'+process.cwd()+'/ocrtest/blank.html'); await pg.addScriptTag({path:'cur_mini.js'}); await pg.evaluate(()=>{window.MiniOCR=MiniOCR;});
  const dir=process.argv[2]; const out={};
  for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.png')).sort())
    out[f]=await pg.evaluate(async(src)=>{const im=new Image(); im.src=src; await im.decode(); const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; c.getContext('2d').drawImage(im,0,0); return MiniOCR.readImage(c);}, 'data:image/png;base64,'+fs.readFileSync(dir+'/'+f).toString('base64'));
  fs.writeFileSync(dir+'/mini.json',JSON.stringify(out)); for(const [k,v] of Object.entries(out)) console.log(k, JSON.stringify(v.slice(0,4)));
  await b.close();
})();
