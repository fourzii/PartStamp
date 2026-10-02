const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright');
(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage();
  await pg.route(/^https?:\/\//, r=>r.abort()); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('file://'+process.cwd()+'/out/Part%20Stamp.html'); await pg.waitForFunction(()=>window.pdfjsLib&&window.PDFLib);
  const fs=require('fs'); await pg.setInputFiles('#pdf-input', fs.readdirSync('multi').map(f=>'multi/'+f));
  await pg.waitForFunction(()=>S.parts.length>0 && !document.getElementById('detect').disabled, null, {timeout:60000});
  console.log('title:', await pg.textContent('#pdf-title'));
  console.log('parts:', await pg.evaluate(()=>S.parts.map(p=>p.label+':'+p.pages.map(x=>x+1).join(',')).join(' | ')));
  console.log('pdf name:', await pg.evaluate(()=>S.pdfName), '| errors:', errs.length?errs:'none'); await b.close();
})();
