import { adminPost } from '@/lib/security';
import { db } from '@/lib/db';
import { error } from '@/lib/response';
import { storedCertificate } from '@/lib/pdf';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; studentId: string }> }) {
  const denied = await adminPost(request); if (denied) return denied;
  const { id, studentId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(studentId)) return error('Aluno inválido.');
  const client = db();
  const { data: student } = await client.from('workshop_students').select('id')
    .eq('id', studentId).eq('workshop_id', id).is('deleted_at', null).maybeSingle();
  if (!student) return error('Aluno não encontrado.', 404);
  const { data, error: dbError } = await client.rpc('reissue_workshop_certificate', { p_student_id: studentId });
  if (dbError || !data?.length) return error(dbError?.message || 'Certificado não encontrado.', 409);
  try { await storedCertificate(data[0].certificate_id); }
  catch { return error('Reemissão registrada, mas o PDF não foi salvo. Abra o certificado novamente para concluir.', 500); }
  return Response.json({ certificateId: data[0].certificate_id, reissuedAt: data[0].reissued_at });
}
