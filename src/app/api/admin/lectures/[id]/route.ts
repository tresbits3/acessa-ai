import { db } from '@/lib/db';
import { adminPost } from '@/lib/security';
import { error } from '@/lib/response';
import { z } from 'zod';
const schema=z.object({title:z.string().trim().min(3).max(180).optional(),speaker:z.string().trim().min(3).max(180).optional(),event_date:z.iso.date().optional(),workload:z.string().trim().max(80).optional(),details:z.string().trim().max(260).optional()}).strict();
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const denied=await adminPost(request);if(denied)return denied;
  try{const {id}=await params;const input=schema.parse(await request.json());if(!Object.keys(input).length)return error('Informe ao menos uma alteração.');
    const {data,error:dbError}=await db().from('lectures').update(input).eq('id',id).is('deleted_at',null).select('id,title,speaker,event_date,workload,details').maybeSingle();
    if(!data&&!dbError)return error('Palestra não encontrada.',404);
    if(dbError)throw dbError;return Response.json(data);
  }catch(e){return error(e instanceof Error?e.message:'Falha ao atualizar.',400)}
}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
  const denied=await adminPost(request);if(denied)return denied;
  const {id}=await params;
  const {data, error:dbError}=await db().from('lectures').update({deleted_at:new Date().toISOString()})
    .eq('id',id).is('deleted_at',null).select('id').maybeSingle();
  if(dbError)return error('Falha ao excluir palestra.',500);
  if(!data)return error('Palestra não encontrada.',404);
  return Response.json({id:data.id});
}
