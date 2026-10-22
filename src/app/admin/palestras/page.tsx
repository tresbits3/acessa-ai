import { db } from '@/lib/db';
import { LectureAdmin } from './ui';
export default async function LecturesPage(){
  const {data,error}=await db().from('lectures').select('id,title,speaker,event_date,workload,deleted_at,participants(id,certificates(id))').order('event_date',{ascending:false});
  if(error)throw error;
  return <LectureAdmin lectures={(data||[]).map(l=>({...l,participantCount:l.participants.length,certificateCount:l.participants.reduce((n,p)=>n+p.certificates.length,0)}))}/>;
}
