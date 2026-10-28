import { certificateData,storedCertificate } from '@/lib/pdf';import { pdfResponse,error } from '@/lib/response';
export const dynamic = 'force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))return error('Não encontrado.',404);const data=await certificateData(id);if(!data)return error('Não encontrado.',404);return pdfResponse(await storedCertificate(id),`certificado-${id}.pdf`,new URL(request.url).searchParams.has('inline'));}catch{return error('PDF indisponível.',500)}}
