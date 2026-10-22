import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { origin } from '@/lib/config';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { LectureDetail } from './ui';
export default async function LectureDetailPage({params}:{params:Promise<{id:string}>}){
  await requireAdmin();
  const {id}=await params;const client=db();const {data:lecture,error}=await client.from('lectures').select('id,title,speaker,event_date,workload,details,slug').eq('id',id).is('deleted_at',null).maybeSingle();if(error)throw error;if(!lecture)notFound();
  const {data:participants,error:peopleError}=await client.from('participants').select('id,full_name,phone_e164,email,certificates(id)').eq('lecture_id',id).order('full_name');if(peopleError)throw peopleError;
  const lectureUrl=`${origin()}/p/${lecture.slug}`;
  const qr=await QRCode.toDataURL(lectureUrl,{width:320,margin:2});
  return <LectureDetail lecture={lecture} participants={(participants||[]).map(p=>({id:p.id,name:p.full_name,phone:p.phone_e164,email:p.email,certificateId:(p.certificates as unknown as {id:string}[])?.[0]?.id||''}))} lectureUrl={lectureUrl} qr={qr}/>;
}
