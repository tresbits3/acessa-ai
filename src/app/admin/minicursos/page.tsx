import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { BundleAll } from './ui';
const formatDate=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC',day:'2-digit',month:'long',year:'numeric'});
export default async function WorkshopPage(){
  await requireAdmin();
  const client=db();
  const {data:workshops,error}=await client.from('workshops').select('id,title,teacher,event_date,workload').order('event_date');
  if(error)throw error;
  const items=await Promise.all((workshops||[]).map(async w=>{
    const {data:students,error:studentError}=await client.from('workshop_students').select('certificates(id)').eq('workshop_id',w.id).is('deleted_at',null);
    if(studentError)throw studentError;
    return {...w,count:students?.length||0,ids:(students||[]).map(s=>(s.certificates as unknown as {id:string}|null)?.id).filter((id):id is string=>!!id)};
  }));
  return <><div className="page-heading"><p className="eyebrow">Organização / Minicursos</p><h1>Minicursos</h1><p>Consulte os cursos, gerencie os alunos e emita certificados.</p></div><BundleAll ids={items.flatMap(i=>i.ids)}/><section className="card list-card"><div className="section-heading"><h2>Cursos cadastrados</h2><span className="muted">{items.length} curso(s)</span></div>{items.length?items.map(w=><div className="list-row" key={w.id}><div><h3>{w.title}</h3><p>Prof. {w.teacher}</p><p>{formatDate(w.event_date)} · {w.workload||'Carga horária não informada'}</p></div><div className="row"><span><span className="count">{w.count}</span> alunos</span><a className="button secondary" href={`/admin/minicursos/${w.id}`}>Ver alunos →</a></div></div>):<p className="empty-state">Nenhum minicurso cadastrado.</p>}</section></>;
}
