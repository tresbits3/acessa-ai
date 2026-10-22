import { adminPost } from '@/lib/security';
import { db } from '@/lib/db';
import { certificateData, storedCertificate } from '@/lib/pdf';

export const maxDuration = 300;

export async function POST(request: Request) {
  const denied = await adminPost(request);
  if (denied) return denied;

  const client = db();
  const { data: certificates, error: queryError } = await client
    .from('certificates').select('id,revision').order('id').limit(1000);
  if (queryError || !certificates) return Response.json({ error: 'Não foi possível listar os certificados.' }, { status: 500 });

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const ids: string[] = [];

  for (const certificate of certificates) {
    if (!await certificateData(certificate.id)) {
      skipped++;
      continue;
    }
    const result = await client.from('certificates')
      .update({ revision: certificate.revision + 1 })
      .eq('id', certificate.id).eq('revision', certificate.revision).select('id');
    if (result.error || !result.data?.length) {
      failed++;
      continue;
    }
    ids.push(certificate.id);
  }

  for (let offset = 0; offset < ids.length; offset += 5) {
    const batch = await Promise.all(ids.slice(offset, offset + 5).map(async id => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await storedCertificate(id);
          return true;
        } catch {
          if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
        }
      }
      return false;
    }));
    for (const succeeded of batch) succeeded ? updated++ : failed++;
  }

  return Response.json({ updated, skipped, failed }, { status: failed ? 500 : 200 });
}
