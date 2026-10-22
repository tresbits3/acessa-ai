'use client';
import { useState } from 'react';

type Lecture = {id:string;title:string;speaker:string;event_date:string;workload:string|null;deleted_at:string|null;participantCount:number;certificateCount:number};
const date=(value:string)=>new Date(value+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC',day:'2-digit',month:'long',year:'numeric'});

export function LectureAdmin({lectures}:{lectures:Lecture[]}){
  const [items]=useState(lectures),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const active=items.filter(l=>!l.deleted_at);

  async function create(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMessage('');
    try{const form=new FormData(e.currentTarget);const res=await fetch('/api/admin/lectures',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(form))});const data=await res.json();if(!res.ok)throw new Error(data.error||'Não foi possível cadastrar.');location.assign(`/admin/palestras/${data.id}`)}
    catch(e){setMessage((e as Error).message);setBusy(false)}
  }

  return <><div className="page-heading"><p className="eyebrow">Organização / Palestras</p><h1>Palestras</h1><p>Cadastre atividades, apresente o QR code na data da palestra e acompanhe participantes.</p><div className="action-bar"><a className="button" href="#nova-palestra">＋ Nova palestra</a></div></div>
    {message&&<p className="error" role="status">{message}</p>}
    <section className="card list-card"><div className="section-heading"><h2>Atividades cadastradas</h2><span className="muted">{active.length} palestra(s)</span></div>{active.length?active.map(l=><div className="list-row" key={l.id}><div><h3>{l.title}</h3><p>{date(l.event_date)} · {l.speaker} · {l.workload||'Carga horária não informada'}</p></div><div className="row"><a className="button secondary" href={`/admin/palestras/${l.id}`}>Ver detalhes →</a></div></div>):<p className="empty-state">Nenhuma palestra cadastrada. Use o formulário abaixo para começar.</p>}</section>
    <section id="nova-palestra" className="card"><div className="section-heading"><div><p className="eyebrow">Nova atividade</p><h2>Cadastrar palestra</h2></div></div><form className="stack" onSubmit={create}><div className="form-grid"><label className="full">Título da palestra<input name="title" required minLength={3}/></label><label>Palestrante<input name="speaker" required minLength={3}/></label><label>Data<input name="event_date" type="date" required/></label><label>Carga horária<input name="workload" placeholder="Ex.: 2 horas"/></label><label className="full">Informações adicionais para o certificado<textarea name="details"/></label></div><div><button disabled={busy}>{busy?'Cadastrando…':'Cadastrar palestra'}</button></div></form></section>
    </>;
}
