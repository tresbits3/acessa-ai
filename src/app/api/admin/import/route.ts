import { adminPost } from '@/lib/security';
import { previewCsv } from '@/lib/import';
import { db } from '@/lib/db';
import { error } from '@/lib/response';
import { storedCertificate } from '@/lib/pdf';

export const maxDuration = 300;
export async function POST(request: Request) {
  const denied = await adminPost(request); if (denied) return denied;
  const csv = await request.text();
  if (csv.length > 1_000_000) return error('Arquivo grande demais.');
  const preview = previewCsv(csv);
  if (preview.errors.length) return Response.json(preview, { status: 422 });
  if (request.headers.get('x-import-confirm') !== 'yes') return Response.json(preview);
  const client = db();
  const { data, error: dbError } = await client.rpc('import_workshops', { p_courses: preview.courses });
  if (dbError) return error(dbError.message, 409);
  const keys = preview.courses.map(course => course.key);
  const { data: workshops, error: courseError } = await client.from('workshops').select('id').in('import_key', keys);
  if (courseError || !workshops) return error('Importação registrada, mas falhou a geração dos PDFs.', 500);
  const ids: string[] = [];
  for (const workshop of workshops) {
    const { data: students, error: studentError } = await client.from('workshop_students')
      .select('certificates(id)').eq('workshop_id', workshop.id).is('deleted_at', null);
    if (studentError || !students) return error('Importação registrada, mas falhou a geração dos PDFs.', 500);
    for (const student of students) {
      const id = (student.certificates as unknown as { id: string } | null)?.id;
      if (id) ids.push(id);
    }
  }
  try { for (let i = 0; i < ids.length; i += 5) await Promise.all(ids.slice(i, i + 5).map(id => storedCertificate(id))); }
  catch { return error('Importação registrada, mas falhou a geração de parte dos PDFs. Reimporte a mesma lista para concluir.', 500); }
  return Response.json({ preview, result: data });
}
