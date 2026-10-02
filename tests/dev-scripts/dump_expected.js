// prints expected.json content from the cached detection results
const fs=require('fs'); const [kind, sj, mj, pdfName, note]=process.argv.slice(2);
const src=fs.readFileSync('app.js','utf8'); const D=JSON.parse(fs.readFileSync(sj,'utf8'));
eval(src.slice(src.indexOf('const ALIASES'), src.indexOf('function parseRanges')));
var S={numPages:D.N,fullText:[],nextId:1,fps:null,rep:D.rep}; var isFileStart=()=>false;
eval(src.slice(src.indexOf('function samePage'), src.indexOf('function scanStatus')));
const cleanT=t=>String(t||"").split(/\n+/).map(t=>t.replace(/(\s)[|Il](?=\s*$|\s)/g,"$11").replace(/[|_~{}\[\]<>]/g," ").replace(/\s+/g," ").trim()).filter(t=>/[a-z]{3}/i.test(t)&&t.length<=60&&t.split(" ").length<=7);
const lbp=new Array(D.N).fill(null).map(()=>[]);
if (kind==='tess') for(const [k,t] of Object.entries(D.ocr||{})) lbp[+k]=cleanT(t);
else { const M=JSON.parse(fs.readFileSync(mj,'utf8')); for(const i of D.todo){ const f='p'+String(i+1).padStart(3,'0')+'.png'; lbp[i]=(M[f]||[]).map(t=>t.replace(/\s+/g," ").trim()).filter(t=>/[a-z]{3}/i.test(t)&&t.length<=60&&t.split(" ").length<=7);} }
const lines=D.rep.map(r=>lbp[r]);
const scoreLike=lines.map((ls,i)=>(D.sc&&D.sc[i])||looksLikeScore(ls.flatMap(t=>phrasesIn(t)),3));
const parts=partsFromLabels(markFrontMatter(textLabels(lines),scoreLike));
const skipped=Object.entries(S.skip).map(([k,v])=>({page:+k+1,reason:v})).sort((a,b)=>a.page-b.page);
const copies={}; D.rep.forEach((r,i)=>{ if(r!==i) (copies[r+1]=copies[r+1]||[]).push(i+1); });
console.log(JSON.stringify({pdf:pdfName, pages:D.N, note, skippedPages:skipped, parts:parts.map(p=>({name:p.label,pages:p.pages.map(x=>x+1)})), duplicateCopies:copies},null,1));
