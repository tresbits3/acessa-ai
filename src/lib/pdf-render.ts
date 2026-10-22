import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
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
  const script=await pdf.embedFont(await readFile(path.join(process.cwd(),'assets','GreatVibes-Regular.ttf')));
  const green=rgb(.09,.227,.192),muted=rgb(.325,.380,.345);
  const upperTitle=data.title.toLocaleUpperCase('pt-BR');
  const title=bold.widthOfTextAtSize(upperTitle,27)<=485
    ? {size:27,lines:[upperTitle]} : fitted(upperTitle,bold,485,2,18,9);
  drawCentered(page,title.lines,bold,title.size,title.lines.length===1?249:262,title.lines.length===1?0:20,green);
  const name=script.widthOfTextAtSize(data.student,40)<=510
    ? {size:40,lines:[data.student]}
    : (()=>{try{return fitted(data.student,script,510,2,28,18)}catch{return fitted(data.student,script,510,3,18,12)}})();
  drawCentered(page,name.lines,script,name.size,name.lines.length===1?351:name.lines.length===2?373:383,name.lines.length===2?32:24,green);
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
  return new Uint8Array(await combined.save());
}
