const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright');
(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1300,height:950}});
  await pg.route(/^https?:\/\//, r=>r.abort());
  pg.on('console',m=>{ if(m.type()!=='log') console.log('CONSOLE', m.type(), m.text().slice(0,200)); });
  pg.on('pageerror',e=>console.log('PAGEERROR', e.message)); pg.on('crash',()=>console.log('PAGE CRASHED'));
  pg.on('worker', w=>{ console.log('worker started'); w.on('close',()=>console.log('worker closed')); });
  await pg.goto('file://'+process.cwd()+'/out/Part%20Stamp.html');
  await pg.waitForFunction(()=>window.pdfjsLib && window.PDFLib);
  const t0=Date.now(); await pg.setInputFiles('#pdf-input', process.argv[2]);
  for(let k=0;k<22;k++){ await new Promise(r=>setTimeout(r,8000));
    const st=await pg.evaluate(()=>({msg:document.getElementById('bar-msg').textContent.slice(-70), parts:S.parts.length, mem: performance.memory? Math.round(performance.memory.usedJSHeapSize/1e6):null})).catch(e=>({err:e.message}));
    console.log(((Date.now()-t0)/1000|0)+'s', JSON.stringify(st)); if (st.msg && /Check them|No parts/.test(st.msg)) break; }
  if (process.argv[3]) console.log(await pg.evaluate(()=>S.parts.map(p=>p.label+':'+p.pages.map(x=>x+1).join(',')).join(' | ')));
  await b.close();
})();
