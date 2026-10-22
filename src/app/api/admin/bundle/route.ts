import { adminPost } from '@/lib/security';
import { db } from '@/lib/db';
import { bundle } from '@/lib/pdf';
import { error, pdfStreamResponse } from '@/lib/response';

export async function POST(request: Request) {
  const denied = await adminPost(request); if (denied) return denied;
  try {
    const input = await request.json();
    const ids: string[] = input.ids;
    if (!Array.isArray(ids) || ids.length === 0 || ids.some(id => typeof id !== 'string') || new Set(ids).size !== ids.length)
      return error('Seleção inválida.');
    const client = db();
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const { data, error: dbError } = await client.from('certificates')
        .select('id,kind,workshop_students(deleted_at)').in('id', batch);
      if (dbError || !data || data.length !== batch.length || data.some(cert =>
        cert.kind !== 'workshop' || !cert.workshop_students ||
        (cert.workshop_students as unknown as { deleted_at: string | null }).deleted_at !== null))
        return error('Seleção inválida.', 400);
    }
    return pdfStreamResponse(await bundle(ids), 'certificados-minicursos.pdf', !!input.inline);
  } catch { return error('Falha ao montar PDF.', 500); }
}
