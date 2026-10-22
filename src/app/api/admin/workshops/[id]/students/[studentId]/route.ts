import { adminPost } from '@/lib/security';
import { db } from '@/lib/db';
import { error } from '@/lib/response';
import { studentSchema, checkedName, databaseError } from '@/lib/workshop-input';
import { purgeWorkshopCertificateFiles } from '@/lib/pdf';

type Params = { params: Promise<{ id: string; studentId: string }> };
export async function PATCH(request: Request, context: Params) {
  const denied = await adminPost(request); if (denied) return denied;
  const { id, studentId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(studentId)) return error('Aluno inválido.');
  const parsed = studentSchema.safeParse(await request.json());
  if (!parsed.success) return error('Informe o nome completo do aluno.');
  let student; try { student = checkedName(parsed.data.name); } catch { return error('Informe o nome completo do aluno.'); }
  const client = db();
  const { data, error: dbError } = await client.from('workshop_students')
    .update({ full_name: student.name, name_key: student.key })
    .eq('id', studentId).eq('workshop_id', id).is('deleted_at', null).select('id').maybeSingle();
  if (dbError) return error(databaseError(dbError), 409);
  if (!data) return error('Aluno não encontrado.', 404);
  try { await purgeWorkshopCertificateFiles([studentId]); }
  catch { return error('Nome salvo, mas falhou a limpeza do PDF antigo.', 500); }
  return Response.json({ ok: true });
}

export async function DELETE(request: Request, context: Params) {
  const denied = await adminPost(request); if (denied) return denied;
  const { id, studentId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(studentId)) return error('Aluno inválido.');
  const client = db();
  const { data, error: dbError } = await client.from('workshop_students')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', studentId).eq('workshop_id', id).is('deleted_at', null).select('id').maybeSingle();
  if (dbError) return error(dbError.message, 409);
  if (!data) return error('Aluno não encontrado.', 404);
  try { await purgeWorkshopCertificateFiles([studentId]); }
  catch { return error('Aluno excluído, mas falhou a limpeza do PDF antigo.', 500); }
  return Response.json({ ok: true });
}
