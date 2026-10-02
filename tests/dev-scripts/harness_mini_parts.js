const fs=require('fs'); const [sj, mj]=process.argv.slice(2);
const src=fs.readFileSync('app.js','utf8'); const D=JSON.parse(fs.readFileSync(sj,'utf8')); const M=JSON.parse(fs.readFileSync(mj,'utf8'));
eval(src.slice(src.indexOf('const ALIASES'), src.indexOf('function parseRanges')));
var S={numPages:D.N,fullText:[],nextId:1,fps:null,rep:D.rep}; var isFileStart=()=>false;
eval(src.slice(src.indexOf('function samePage'), src.indexOf('function scanStatus')));
const cleanOcrLine = (t) => t.replace(/(\s)[|Il](?=\s*$|\s)/g, "$11").replace(/[|_~{}\[\]<>]/g, " ").replace(/\s+/g, " ").trim();
const lbp=new Array(D.N).fill(null).map(()=>[]);
for (const i of D.todo) { const f='p'+String(i+1).padStart(3,'0')+'.png'; lbp[i]=(M[f]||[]).map(cleanOcrLine).filter(t=>/[a-z]{3}/i.test(t)&&t.length<=60&&t.split(" ").length<=7); }
const lines=D.rep.map(r=>lbp[r]);
const scoreLike=lines.map((ls,i)=>D.sc[i]||looksLikeScore(ls.flatMap(t=>phrasesIn(t)),3));
const labels=markFrontMatter(textLabels(lines),scoreLike);
const sk=Object.keys(S.skip).map(Number).sort((a,b)=>a-b); console.log('skipped:', fmt=sk.map(x=>x+1).join(','));
const parts=partsFromLabels(labels); for(const p of parts) console.log('  '+p.label.padEnd(60), p.pages.map(x=>x+1).join(','));
console.log(parts.length,'parts');
if (process.argv[4]) { const i=+process.argv[4]-1; console.log('lines', JSON.stringify(lines[i])); console.log('label', JSON.stringify(labels[i]), 'scoreLike', scoreLike[i], 'phrases', JSON.stringify(lines[i].map(t=>phrasesIn(t)))); }
