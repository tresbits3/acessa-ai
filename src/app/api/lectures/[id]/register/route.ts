import { db } from '@/lib/db';import { registerLecture } from '@/lib/lecture';import { error } from '@/lib/response';import { origin } from '@/lib/config';import { storedCertificate } from '@/lib/pdf';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  if(request.headers.get('origin')!==origin())return error('Origem inválida.',403);
  try{const {id}=await params;const {data:l}=await db().from('lectures').select('id').eq('id',id).is('deleted_at',null).maybeSingle();if(!l)return error('Palestra não encontrada.',404);
    const result=await registerLecture(id,await request.json());await storedCertificate(result.certificate_id);return Response.json({certificateId:result.certificate_id,created:result.created});
  }catch(e){return error(e instanceof Error?e.message:'Falha no cadastro.');}
}
