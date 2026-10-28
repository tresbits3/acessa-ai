import { adminPost } from '@/lib/security';
import { db } from '@/lib/db';
import { bundle } from '@/lib/pdf';
import { error } from '@/lib/response';
import { createHash } from 'node:crypto';

export const maxDuration = 300;
const bucketName = 'certificate-bundles';
export async function POST(request: Request) {
  const denied = await adminPost(request); if (denied) return denied;
  try {
    const input = request.headers.get('content-type')?.includes('application/x-www-form-urlencoded')
      ? JSON.parse((await request.formData()).get('payload') as string) : await request.json();
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
    const started = performance.now();
    const bytes = await bundle(ids);
    console.info('certificate bundle ready', { count: ids.length, bytes: bytes.length, ms: Math.round(performance.now() - started) });
    const bucketInfo = await client.storage.getBucket(bucketName);
    if (bucketInfo.error) {
      const created = await client.storage.createBucket(bucketName, {
        public: false, fileSizeLimit: '50MB', allowedMimeTypes: ['application/pdf']
      });
      if (created.error && !(await client.storage.getBucket(bucketName)).data) throw created.error;
    }
    const bucket = client.storage.from(bucketName);
    const file = `${createHash('sha256').update(bytes).digest('hex')}.pdf`;
    const uploaded = await bucket.upload(file, bytes, { contentType: 'application/pdf', upsert: false });
    if (uploaded.error && uploaded.error.statusCode !== '409') throw uploaded.error;
    const signed = await bucket.createSignedUrl(file, 300, input.inline ? undefined : { download: 'certificados-minicursos.pdf' });
    if (signed.error || !signed.data) throw signed.error ?? new Error('Link temporário indisponível');
    return new Response(null, { status: 303, headers: { Location: signed.data.signedUrl, 'Cache-Control': 'private, no-store' } });
  } catch (e) { console.error('certificate bundle failed', e); return error('Falha ao montar PDF.', 500); }
}
