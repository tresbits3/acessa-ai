import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
const formatDate=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC',day:'2-digit',month:'short',year:'numeric'});
export default async function AdminHome(){
  await requireAdmin();
  const client=db();
  const [{data:workshops,error:workshopError},{count:students,error:studentError},{count:lectures,error:lectureError}]=await Promise.all([
    client.from('workshops').select('id,title,teacher,event_date,workload').order('event_date'),
    client.from('workshop_students').select('id',{count:'exact',head:true}).is('deleted_at',null),
    client.from('lectures').select('id',{count:'exact',head:true}).is('deleted_at',null)
  ]);
  if(workshopError||studentError||lectureError)throw workshopError||studentError||lectureError;
  const counts=await Promise.all((workshops||[]).map(async w=>({ ...w,count:(await client.from('workshop_students').select('id',{count:'exact',head:true}).eq('workshop_id',w.id).is('deleted_at',null)).count||0 })));
  return <><div className="page-heading"><p className="eyebrow">Painel do organizador</p><h1>Seu evento, em ordem.</h1><p>Acompanhe atividades, participantes e certificados em um só lugar.</p><div className="action-bar"><a className="button" href="/admin/palestras#nova-palestra">＋ Nova palestra</a></div></div><div className="metric-grid"><div className="metric"><span>Minicursos</span><strong>{workshops?.length||0}</strong><small>Atividades cadastradas</small></div><div className="metric"><span>Alunos inscritos</span><strong>{students||0}</strong><small>Nos minicursos ativos</small></div><div className="metric"><span>Palestras</span><strong>{lectures||0}</strong><small>Atividades cadastradas</small></div></div><section className="card list-card"><div className="section-heading"><h2>Minicursos</h2><a href="/admin/minicursos">Ver todos →</a></div>{counts.length?counts.map(w=><div className="list-row" key={w.id}><div><h3>{w.title}</h3><p>{formatDate(w.event_date)} · {w.teacher} · {w.workload||'Carga horária não informada'}</p></div><div className="row"><span><span className="count">{w.count}</span> alunos</span><a className="button secondary" href={`/admin/minicursos/${w.id}`}>Gerenciar →</a></div></div>):<p className="empty-state">Nenhum minicurso cadastrado.</p>}</section><div className="tile-grid"><a className="subtle-card" href="/admin/minicursos"><h2>Minicursos</h2><p>Gerencie alunos e certificados individuais ou em lote.</p></a><a className="subtle-card" href="/admin/palestras"><h2>Palestras</h2><p>Cadastre atividades, compartilhe QR codes e acompanhe participantes.</p></a></div></>;
}
