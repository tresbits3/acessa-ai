import { adminPost } from '@/lib/security';
import { db } from '@/lib/db';
import { error } from '@/lib/response';
import { studentSchema, checkedName, databaseError } from '@/lib/workshop-input';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminPost(request); if (denied) return denied;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return error('Minicurso inválido.');
  const parsed = studentSchema.safeParse(await request.json());
  if (!parsed.success) return error('Informe o nome completo do aluno.');
  let student; try { student = checkedName(parsed.data.name); } catch { return error('Informe o nome completo do aluno.'); }
  const client = db();
  const { data, error: dbError } = await client.rpc('add_workshop_student', {
    p_workshop_id: id, p_name: student.name, p_name_key: student.key
  });
  if (dbError) return error(databaseError(dbError), 409);
  return Response.json({ id: data }, { status: 201 });
}
