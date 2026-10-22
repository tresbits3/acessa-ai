import { adminPost } from '@/lib/security';
import { db } from '@/lib/db';
import { error } from '@/lib/response';
import { workshopSchema } from '@/lib/workshop-input';
import { normalizeName } from '@/lib/identity';
import { purgeWorkshopCertificateFiles } from '@/lib/pdf';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminPost(request); if (denied) return denied;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return error('Minicurso inválido.');
  const parsed = workshopSchema.safeParse(await request.json());
  if (!parsed.success) return error('Dados do minicurso inválidos.');
  const title = normalizeName(parsed.data.title), teacher = normalizeName(parsed.data.teacher);
  if (title.length < 2 || teacher.length < 2) return error('Título e responsável são obrigatórios.');
  const client = db();
  const { data: previous } = await client.from('workshops').select('title,teacher,event_date,workload').eq('id', id).maybeSingle();
  if (!previous) return error('Minicurso não encontrado.', 404);
  const workload = parsed.data.workload.trim() || null;
  const changed = previous.title !== title || previous.teacher !== teacher || previous.event_date !== parsed.data.event_date
    || previous.workload !== workload;
  const { data, error: dbError } = await client.from('workshops').update({
    title, teacher, event_date: parsed.data.event_date, workload
  }).eq('id', id).select('id').maybeSingle();
  if (dbError) return error(dbError.message, 409);
  if (!data) return error('Minicurso não encontrado.', 404);
  if (changed) {
    const { data: students, error: studentError } = await client.from('workshop_students').select('id').eq('workshop_id', id);
    if (studentError) return error('Dados salvos, mas falhou a limpeza dos PDFs antigos.', 500);
    try { await purgeWorkshopCertificateFiles((students || []).map(student => student.id)); }
    catch { return error('Dados salvos, mas falhou a limpeza dos PDFs antigos.', 500); }
  }
  return Response.json({ ok: true });
}
