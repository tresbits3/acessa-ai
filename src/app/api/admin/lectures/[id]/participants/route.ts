import { db } from '@/lib/db';
import { registerLecture } from '@/lib/lecture';
import { storedCertificate } from '@/lib/pdf';
import { error } from '@/lib/response';
import { adminPost } from '@/lib/security';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = adminPost(request); if (denied) return denied;
  try {
    const { id } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return error('Palestra inválida.');
    const { data: lecture, error: dbError } = await db().from('lectures').select('id').eq('id', id).is('deleted_at', null).maybeSingle();
    if (dbError) throw dbError;
    if (!lecture) return error('Palestra não encontrada.', 404);
    const result = await registerLecture(id, await request.json(), true);
    await storedCertificate(result.certificate_id);
    return Response.json({ certificateId: result.certificate_id, participantId: result.participant_id, created: result.created }, { status: result.created ? 201 : 200 });
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Falha no cadastro.');
  }
}
