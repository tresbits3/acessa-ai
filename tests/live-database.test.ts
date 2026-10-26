import {describe,it,expect} from 'vitest';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import {saoPauloDate} from '../src/lib/lecture-date';

const enabled=process.env.RUN_SUPABASE_INTEGRATION==='1'&&!!process.env.TEST_SUPABASE_URL&&!!process.env.TEST_SUPABASE_SERVICE_ROLE_KEY&&!!process.env.TEST_CONTACT_HASH_SECRET;
const shift=(date:string,days:number)=>new Date(Date.parse(`${date}T12:00:00Z`)+days*86400000).toISOString().slice(0,10);

describe.skipIf(!enabled)('ciclo de palestra no Supabase de teste',()=>{
  it('aplica data, repetição, consulta, exclusão e restauração sem duplicar',async()=>{
    process.env.CONTACT_HASH_SECRET=process.env.TEST_CONTACT_HASH_SECRET;
    const {contactKey}=await import('../src/lib/identity');
    const client=createClient(process.env.TEST_SUPABASE_URL!,process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
    const today=saoPauloDate(),suffix=randomUUID();let lectureId='';
    const register=(name:string,phone:string)=>client.rpc('register_lecture',{
      p_lecture_id:lectureId,p_name:name,p_name_key:name.toLowerCase(),p_phone:`55${phone}`,
      p_phone_hash:contactKey(`55${phone}`),p_email:null
    }).then(({data,error})=>{if(error)throw error;return data[0] as {certificate_id:string;created:boolean}});
    const manual=(name:string,phone:string)=>client.rpc('register_lecture_admin',{
      p_lecture_id:lectureId,p_name:name,p_name_key:name.toLowerCase(),p_phone:`55${phone}`,
      p_phone_hash:contactKey(`55${phone}`),p_email:null
    }).then(({data,error})=>{if(error)throw error;return data[0] as {certificate_id:string;created:boolean}});
    try{
      const {data,error}=await client.from('lectures').insert({slug:`teste-${suffix}`,title:'Palestra de teste',speaker:'Docente de teste',event_date:shift(today,1)}).select('id').single();
      if(error)throw error;lectureId=data.id;
      await expect(register('Participante de teste','11999990000')).rejects.toThrow();
      const early=await manual('Cadastro manual de teste','11999990002');
      expect(early.created).toBe(true);
      expect((await manual('Cadastro manual de teste','11999990002')).certificate_id).toBe(early.certificate_id);
      await expect(manual('Nome diferente de teste','11999990002')).rejects.toThrow();
      const toToday=await client.from('lectures').update({event_date:today}).eq('id',lectureId);if(toToday.error)throw toToday.error;
      const attempts=await Promise.all(Array.from({length:5},()=>register('Participante de teste','11999990000')));
      expect(new Set(attempts.map(x=>x.certificate_id)).size).toBe(1);
      expect(attempts.filter(x=>x.created)).toHaveLength(1);
      const certificateId=attempts[0].certificate_id;
      const toPast=await client.from('lectures').update({event_date:shift(today,-1)}).eq('id',lectureId);if(toPast.error)throw toPast.error;
      await expect(register('Outra pessoa de teste','11999990001')).rejects.toThrow();
      expect((await manual('Outra pessoa de teste','11999990001')).created).toBe(true);
      expect((await register('Participante de teste','11999990000')).certificate_id).toBe(certificateId);
      const removed=await client.from('lectures').update({deleted_at:new Date().toISOString()}).eq('id',lectureId);if(removed.error)throw removed.error;
      await expect(register('Participante de teste','11999990000')).rejects.toThrow();
      await expect(manual('Cadastro manual de teste','11999990002')).rejects.toThrow();
      const restored=await client.from('lectures').update({deleted_at:null}).eq('id',lectureId);if(restored.error)throw restored.error;
      expect((await register('Participante de teste','11999990000')).certificate_id).toBe(certificateId);
      const {count}=await client.from('participants').select('id',{count:'exact',head:true}).eq('lecture_id',lectureId);
      expect(count).toBe(3);
    }finally{
      if(lectureId){const {data:p}=await client.from('participants').select('id').eq('lecture_id',lectureId);for(const x of p||[])await client.from('certificates').delete().eq('participant_id',x.id);await client.from('participants').delete().eq('lecture_id',lectureId);await client.from('recovery_attempts').delete().eq('lecture_id',lectureId);await client.from('lectures').delete().eq('id',lectureId)}
    }
  });
});
