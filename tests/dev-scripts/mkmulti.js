const { PDFDocument, StandardFonts } = require('/home/claude/.npm-global/lib/node_modules/pdf-lib');
const fs=require('fs');
(async()=>{
  const make=async(file, partName, pages)=>{ const d=await PDFDocument.create(); const b=await d.embedFont(StandardFonts.TimesRomanBold), r=await d.embedFont(StandardFonts.TimesRoman);
    for(let k=0;k<pages;k++){ const p=d.addPage([612,792]); if(k===0){ p.drawText('Winter Sky',{x:230,y:728,size:24,font:b}); if(partName) p.drawText(partName,{x:54,y:700,size:13,font:b}); p.drawText('J. Example',{x:480,y:700,size:11,font:r}); }
      for(let s=0;s<9;s++) for(let l=0;l<5;l++) p.drawLine({start:{x:54,y:(k?740:660)-s*70-l*7},end:{x:558,y:(k?740:660)-s*70-l*7},thickness:0.7}); }
    fs.writeFileSync('multi/'+file, await d.save()); };
  await make('Winter Sky - 01 Flute.pdf','Flute',2);
  await make('Winter Sky - 02 Oboe.pdf',null,1);
  await make('Winter Sky - 03 Narrator.pdf','Narrator',1);
})();
