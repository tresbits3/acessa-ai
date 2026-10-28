import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRef, PDFStream, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
export type CertificateData={id:string;kind:'lecture'|'workshop';student:string;title:string;instructor:string;eventDate:string;workload?:string|null;details?:string|null};
const W=841.8898;
function datePt(value:string){return new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'}).format(new Date(`${value}T12:00:00Z`))}
function wrap(text:string,font:PDFFont,size:number,width:number){const lines:string[]=[];let line='';for(const word of text.split(/\s+/)){const trial=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(trial,size)>width&&line){lines.push(line);line=''}if(font.widthOfTextAtSize(word,size)>width){let chunk='';for(const char of word){if(font.widthOfTextAtSize(chunk+char,size)>width&&chunk){lines.push(chunk);chunk=''}chunk+=char}line=chunk}else line=line?`${line} ${word}`:word}if(line)lines.push(line);return lines}
function fitted(text:string,font:PDFFont,width:number,maxLines:number,start:number,min:number){for(let size=start;size>=min;size-=.5){const lines=wrap(text,font,size,width);if(lines.length<=maxLines&&lines.every(x=>font.widthOfTextAtSize(x,size)<=width))return {size,lines}}throw new Error('Texto extenso demais para o certificado; revise os dados da atividade.')}
function drawCentered(page:PDFPage,lines:string[],font:PDFFont,size:number,top:number,step:number,color=rgb(.09,.227,.192)){lines.forEach((line,i)=>page.drawText(line,{x:(W-font.widthOfTextAtSize(line,size))/2,y:top-i*step,size,font,color}))}
export async function renderCertificate(data:CertificateData){
  const filename=data.kind==='lecture'?'modelo-palestra.pdf':'modelo-minicurso.pdf';
  const pdf=await PDFDocument.load(await readFile(path.join(process.cwd(),'models',filename)));
  pdf.registerFontkit(fontkit);const page=pdf.getPage(0);
  const regular=await pdf.embedFont(StandardFonts.TimesRoman),bold=await pdf.embedFont(StandardFonts.TimesRomanBold);
  const nameFont=await pdf.embedFont(await readFile(path.join(process.cwd(),'assets','LiberationSans-Regular.ttf')));
  const green=rgb(.09,.227,.192),muted=rgb(.325,.380,.345);
  const upperTitle=data.title.toLocaleUpperCase('pt-BR');
  const title=bold.widthOfTextAtSize(upperTitle,27)<=485
    ? {size:27,lines:[upperTitle]} : fitted(upperTitle,bold,485,2,18,9);
  drawCentered(page,title.lines,bold,title.size,title.lines.length===1?249:262,title.lines.length===1?0:20,green);
  const displayName=data.student.toLocaleUpperCase('pt-BR');
  let name:{size:number;lines:string[]};
  try{name=fitted(displayName,nameFont,510,2,33,16)}
  catch{
    try{name=fitted(displayName,nameFont,510,3,22,14)}
    catch{name=fitted(displayName,nameFont,510,4,16,10)}
  }
  const nameTop=name.lines.length===1?351:name.lines.length===2?373:name.lines.length===3?373:393;
  const nameStep=name.lines.length===2?32:name.lines.length===3?24:19;
  drawCentered(page,name.lines,nameFont,name.size,nameTop,nameStep,green);
  const body=data.kind==='lecture'
    ? `ministrada por ${data.instructor} em ${datePt(data.eventDate)}.${data.workload?` Carga horária: ${data.workload}.`:''} Avaré - SP - UniFSP Campus Avaré.${data.details?` ${data.details}`:''}`
    : `ministrado por ${data.instructor}${data.workload?`, com carga horária de ${data.workload}`:''}, realizado em ${datePt(data.eventDate)}, em Avaré - SP.${data.details?` ${data.details}`:''}`;
  const description=fitted(body,regular,610,5,10,8);
  drawCentered(page,description.lines,regular,description.size,208,12,muted);
  const instructor=fitted(data.instructor,regular,280,2,9,6);
  instructor.lines.forEach((line,i)=>{const x=621.8898-regular.widthOfTextAtSize(line,instructor.size)/2;page.drawText(line,{x,y:instructor.lines.length===1?79:83-i*10,size:instructor.size,font:regular,color:green})});
  page.drawText(`ID ${data.id}`,{x:65,y:36,size:6.5,font:regular,color:muted});
  pdf.setTitle(`Certificado ${data.id}`);pdf.setCreator('III Simpósio de Fisioterapia da UniFSP');
  pdf.setCreationDate(new Date('2026-01-01T00:00:00Z'));pdf.setModificationDate(new Date('2026-01-01T00:00:00Z'));
  return new Uint8Array(await pdf.save());
}
export async function mergePdfBytes(documents:Uint8Array[]){
  const combined=await PDFDocument.create();
  for(const bytes of documents){const source=await PDFDocument.load(bytes);if(source.getPageCount()!==1)throw new Error('Certificado individual deve ter uma página');const [page]=await combined.copyPages(source,[0]);combined.addPage(page)}
  // copyPages imports the same template images once per certificate. Share identical
  // image streams, including transparency masks, without changing image quality.
  for (let pass = 0; pass < 2; pass++) {
    const canonical = new Map<string, PDFRef>();
    const duplicates = new Map<string, PDFRef>();
    for (const [ref, object] of combined.context.enumerateIndirectObjects()) {
      if (!(object instanceof PDFStream) || object.dict.get(PDFName.of('Subtype'))?.toString() !== '/Image') continue;
      const digest = createHash('sha256');
      for (const [key, value] of object.dict.entries().sort(([a], [b]) => a.toString().localeCompare(b.toString()))) {
        digest.update(key.toString()).update(value.toString());
      }
      digest.update(object.getContents());
      const hash = digest.digest('hex');
      const original = canonical.get(hash);
      if (original) duplicates.set(ref.toString(), original);
      else canonical.set(hash, ref);
    }
    if (!duplicates.size) continue;
    const visit = (object: PDFDict | PDFArray) => {
      if (object instanceof PDFDict) {
        for (const [key, value] of object.entries()) {
          if (value instanceof PDFRef && duplicates.has(value.toString())) object.set(key, duplicates.get(value.toString())!);
          else if (value instanceof PDFDict || value instanceof PDFArray) visit(value);
        }
      } else {
        for (let i = 0; i < object.size(); i++) {
          const value = object.get(i);
          if (value instanceof PDFRef && duplicates.has(value.toString())) object.set(i, duplicates.get(value.toString())!);
          else if (value instanceof PDFDict || value instanceof PDFArray) visit(value);
        }
      }
    };
    for (const [, object] of combined.context.enumerateIndirectObjects()) {
      if (object instanceof PDFStream) visit(object.dict);
      else if (object instanceof PDFDict || object instanceof PDFArray) visit(object);
    }
    for (const ref of combined.context.enumerateIndirectObjects().map(([ref]) => ref)) {
      if (duplicates.has(ref.toString())) combined.context.delete(ref);
    }
  }
  return new Uint8Array(await combined.save());
}
