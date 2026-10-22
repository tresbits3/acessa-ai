import { db } from '@/lib/db';
import { adminPost } from '@/lib/security';
import { error } from '@/lib/response';

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const denied=await adminPost(request);if(denied)return denied;
  const {id}=await params;
  const {data,error:dbError}=await db().from('lectures').update({deleted_at:null})
    .eq('id',id).not('deleted_at','is',null).select('id').maybeSingle();
  if(dbError)return error('Falha ao restaurar palestra.',500);
  if(!data)return error('Palestra não encontrada.',404);
  return Response.json({id:data.id});
}
