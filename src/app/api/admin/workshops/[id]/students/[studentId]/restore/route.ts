import { adminPost } from '@/lib/security';
import { db } from '@/lib/db';
import { error } from '@/lib/response';
import { databaseError } from '@/lib/workshop-input';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; studentId: string }> }) {
  const denied = await adminPost(request); if (denied) return denied;
  const { id, studentId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(studentId)) return error('Aluno inválido.');
  const { data, error: dbError } = await db().from('workshop_students').update({ deleted_at: null })
    .eq('id', studentId).eq('workshop_id', id).not('deleted_at', 'is', null).select('id').maybeSingle();
  if (dbError) return error(databaseError(dbError), 409);
  if (!data) return error('Aluno excluído não encontrado.', 404);
  return Response.json({ ok: true });
}
