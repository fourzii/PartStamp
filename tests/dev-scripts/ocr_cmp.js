const fs=require('fs'); const src=fs.readFileSync('app.js','utf8');
eval(src.slice(src.indexOf('const ALIASES'), src.indexOf('function parseRanges')));
const T=JSON.parse(fs.readFileSync('ocrtest/tess.json','utf8')), M=JSON.parse(fs.readFileSync('ocrtest/mini.json','utf8'));
const clean=t=>String(t||"").split(/\n+/).map(t=>t.replace(/(\s)[|Il](?=\s*$|\s)/g,"$11").replace(/[|_~{}\[\]<>]/g," ").replace(/\s+/g," ").trim()).filter(t=>/[a-z]{3}/i.test(t)&&t.length<=60);
const key=ls=>{ for(const l of ls.filter(t=>t.split(" ").length<=7)){ const p=phrasesIn(l); if(p.length) return p[0]; } return "-"; };
let ok=0,n=0; const bad=[];
for(const f of Object.keys(T).sort()){
  const kt=key(clean(T[f])), km=key((M[f]||[]).filter(t=>/[a-z]{3}/i.test(t)));
  n++; if(kt===km) ok++; else bad.push(`${f.slice(8,15)}  tess=${kt.padEnd(22)} mini=${km.padEnd(22)} ${JSON.stringify((M[f]||[]).slice(0,3))}`);
}
console.log(`agree ${ok}/${n}`); bad.forEach(b=>console.log(b));
