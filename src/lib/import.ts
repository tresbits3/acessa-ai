import { parse } from 'csv-parse/sync';
import { normalizeName,nameKey } from './identity';
export type ImportCourse={key:string;title:string;teacher:string;event_date:string;workload:string;details:string;students:{name:string;key:string}[]};
export function previewCsv(csv:string){
  const records=parse(csv,{columns:true,skip_empty_lines:true,bom:true,trim:true}) as Record<string,string>[];
  const errors:string[]=[];const map=new Map<string,ImportCourse>();
  if(records.length===0)errors.push('Arquivo vazio.');
  records.forEach((r,i)=>{const n=i+2;const title=normalizeName(r.curso||'');const teacher=normalizeName(r.professor||'');const date=(r.data||'').trim();const name=normalizeName(r.aluno||'');const workload=(r.carga_horaria||'').trim();const details=(r.detalhes||'').trim();
    const validDate=/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(`${date}T00:00:00Z`))&&new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)===date;
    if(!title||!teacher||!validDate||!name)errors.push(`Linha ${n}: curso, professor, data válida (AAAA-MM-DD) e aluno são obrigatórios.`);
    if(title.length>180||teacher.length>180||name.length>180||workload.length>80||details.length>260)errors.push(`Linha ${n}: campo longo demais.`);
    const key=nameKey(title);const existing=map.get(key);
    if(existing&&(existing.teacher!==teacher||existing.event_date!==date||existing.workload!==workload||existing.details!==details))errors.push(`Linha ${n}: dados divergentes para ${title}.`);
    const course=existing||{key,title,teacher,event_date:date,workload,details,students:[]};
    if(course.students.some(s=>s.key===nameKey(name)))errors.push(`Linha ${n}: nome repetido em ${title}: ${name}. É preciso identificar o aluno com segurança antes de importar.`);
    course.students.push({name,key:nameKey(name)});map.set(key,course);
  });
  return {courses:[...map.values()],errors,rows:records.length};
}
