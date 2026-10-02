const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright');
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({acceptDownloads:true, viewport:{width:1300,height:950}});
  const pg=await ctx.newPage();
  let blocked=0; await pg.route(/^https?:\/\//, r=>{ blocked++; r.abort(); });   // no internet at all
  const errs=[]; pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });
  await pg.goto('file://'+process.cwd()+'/out/Part%20Stamp.html');
  await pg.waitForFunction(()=>window.pdfjsLib && window.PDFLib, null, {timeout:20000});
  console.log('built-in PDF tools started offline');
  await pg.click('#try-sample');
  await pg.waitForFunction(()=>S.parts.length>0, null, {timeout:60000});
  console.log('parts:', await pg.evaluate(()=>S.parts.map(p=>p.label+':'+p.pages.map(x=>x+1).join(',')).join(' | ')));
  await pg.click('#sample-names');
  await pg.waitForFunction(()=>!document.getElementById('build').disabled, null, {timeout:20000});
  await pg.waitForTimeout(1500);
  await (await pg.$('#sec-stamp')).screenshot({path:'stamp_offline.png'});
  const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:120000}), pg.click('#build')]);
  await dl.saveAs('out_named.pdf');
  console.log('downloaded:', dl.suggestedFilename(), '| bar:', await pg.textContent('#bar-msg'));
  console.log('internet requests blocked:', blocked, '| errors:', errs.length?errs:'none');
  await b.close();
})();
