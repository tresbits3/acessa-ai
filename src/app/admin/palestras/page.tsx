import { db } from '@/lib/db';
import { LectureAdmin } from './ui';
export default async function LecturesPage(){
  const {data,error}=await db().from('lectures').select('id,title,speaker,event_date,workload,deleted_at').order('event_date',{ascending:false});
  if(error)throw error;
  return <LectureAdmin lectures={data||[]}/>;
}
