// run the page's own layout code over rendered pages; args: dir, struct.json
const fs=require('fs'); const [dir, sj]=process.argv.slice(2);
const src=fs.readFileSync('app.js','utf8');
eval(src.slice(src.indexOf('function pageLayout'), src.indexOf('const withTimeout')));
eval(src.slice(src.indexOf('function layoutStarts'), src.indexOf('/* ---------- built-in part-name reader')));
function cv(f){const b=fs.readFileSync(f);const s=b.toString('latin1',0,40).split(/\s+/);const w=+s[1],h=+s[2];const px=b.subarray(b.indexOf(Buffer.from('255\n'))+4);const d=new Uint8ClampedArray(w*h*4);for(let i=0;i<w*h;i++){d[i*4]=d[i*4+1]=d[i*4+2]=px[i];d[i*4+3]=255;}return{width:w,height:h,getContext:()=>({getImageData:()=>({data:d})})};}
const S_=JSON.parse(fs.readFileSync(sj,'utf8')); const files=fs.readdirSync(dir).filter(f=>/^pg-\d+\.pgm$/.test(f)).sort();
const staff=[],gap=[],lines=[];
files.forEach((f,i)=>{ if(S_.rep[i]!==i){staff.push(null);gap.push(null);lines.push(null);return;} const L=pageLayout(cv(dir+'/'+f)); staff.push(L.first); gap.push(L.gap); lines.push(L.lines); });
S_.rep.forEach((r,i)=>{ if(r!==i){staff[i]=staff[r];gap[i]=gap[r];lines[i]=lines[r];} });
const sc=scorePagesByLayout(gap,lines); const prep={staff,gap,scoreish:sc,rep:S_.rep};
const g=layoutStarts(prep,true); const uniq=S_.rep.map((r,i)=>r===i?i:-1).filter(i=>i>=0);
const todo=uniq.filter(i=>g[i]);
Object.assign(S_,{staff,gap,lines,sc,todo});
fs.writeFileSync(sj,JSON.stringify(S_));
console.log('score pages:',JSON.stringify(sc.map((x,i)=>x?i+1:0).filter(Boolean)));
console.log('to read:',todo.map(i=>i+1).join(','));
console.log('per page (p:first/gap‰/lines):', staff.map((s,i)=>`${i+1}:${s.toFixed(2)}/${(gap[i]*1000).toFixed(1)}/${lines[i]}`).join(' '));
