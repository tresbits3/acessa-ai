import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { WorkshopAdmin } from '../ui';
export default async function WorkshopDetail({params}:{params:Promise<{id:string}>}){
  const {id}=await params;const client=db();
  const {data:w,error}=await client.from('workshops').select('id,title,teacher,event_date,workload').eq('id',id).maybeSingle();
  if(error)throw error;if(!w)notFound();
  const {data:students,error:studentError}=await client.from('workshop_students').select('id,full_name,deleted_at,certificates(id,reissued_at)').eq('workshop_id',id).order('full_name');
  if(studentError)throw studentError;
  const mapped=(students||[]).map(s=>{const certificate=s.certificates as unknown as {id:string;reissued_at:string|null}|null;return {id:s.id,name:s.full_name,certificateId:certificate?.id||'',reissuedAt:certificate?.reissued_at||null,deletedAt:s.deleted_at as string|null}});
  return <WorkshopAdmin workshop={{...w,students:mapped.filter(s=>!s.deletedAt),deletedStudents:mapped.filter(s=>s.deletedAt)}}/>;
}
