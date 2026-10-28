import 'server-only';
import { db } from './db';
import { CertificateData, renderCertificate, mergePdfBytes } from './pdf-render';
import { certificateFile } from './certificate-file';
export { renderCertificate } from './pdf-render';
export type { CertificateData } from './pdf-render';

type StoredCertificateData = CertificateData & { revision: number; storagePath: string | null };

export async function certificateData(id: string): Promise<StoredCertificateData | null> {
  const client = db();
  const { data: cert, error } = await client.from('certificates').select('*').eq('id', id).maybeSingle();
  if (error || !cert) return null;
  if (cert.kind === 'lecture') {
    const { data: participant } = await client.from('participants').select('full_name,lecture_id').eq('id', cert.participant_id).single();
    if (!participant) return null;
    const { data: lecture } = await client.from('lectures').select('*').eq('id', participant.lecture_id).is('deleted_at', null).maybeSingle();
    if (!lecture) return null;
    return { id, kind: 'lecture', student: participant.full_name, title: lecture.title, instructor: lecture.speaker,
      eventDate: lecture.event_date, workload: lecture.workload, details: lecture.details,
      revision: cert.revision, storagePath: cert.storage_path };
  }
  const { data: student } = await client.from('workshop_students').select('full_name,workshop_id,deleted_at')
    .eq('id', cert.workshop_student_id).single();
  if (!student || student.deleted_at) return null;
  const { data: workshop } = await client.from('workshops').select('*').eq('id', student.workshop_id).single();
  if (!workshop) return null;
  return { id, kind: 'workshop', student: student.full_name, title: workshop.title, instructor: workshop.teacher,
    eventDate: workshop.event_date, workload: workshop.workload, details: workshop.details,
    revision: cert.revision, storagePath: cert.storage_path };
}

export async function storedCertificate(id: string) {
  const client = db();
  const data = await certificateData(id);
  if (!data) throw new Error('Certificado não encontrado');
  const file = certificateFile(data);
  const bucket = client.storage.from('certificates');
  const existing = await bucket.download(file);
  if (!existing.error && existing.data) {
    if (data.storagePath !== file) {
      const updated = await client.from('certificates').update({ storage_path: file })
        .eq('id', id).eq('revision', data.revision).select('id');
      if (updated.error || !updated.data?.length) throw new Error('Certificado alterado durante a leitura; tente novamente.');
      if (data.storagePath) await bucket.remove([data.storagePath]);
    }
    return new Uint8Array(await existing.data.arrayBuffer());
  }
  const bytes = await renderCertificate(data);
  const upload = await bucket.upload(file, bytes, { contentType: 'application/pdf', upsert: false });
  if (upload.error) {
    const again = await bucket.download(file);
    if (again.error || !again.data) throw upload.error;
    return new Uint8Array(await again.data.arrayBuffer());
  }
  const updated = await client.from('certificates').update({ storage_path: file })
    .eq('id', id).eq('revision', data.revision).select('id');
  if (updated.error || !updated.data?.length) throw new Error('Certificado alterado durante a geração; tente novamente.');
  if (data.storagePath && data.storagePath !== file) await bucket.remove([data.storagePath]);
  return bytes;
}

export async function purgeWorkshopCertificateFiles(studentIds: string[]) {
  if (!studentIds.length) return;
  const client = db();
  for (let i = 0; i < studentIds.length; i += 100) {
    const { data: certificates, error } = await client.from('certificates').select('id,storage_path')
      .in('workshop_student_id', studentIds.slice(i, i + 100));
    if (error) throw error;
    const stored = (certificates || []).filter(cert => cert.storage_path);
    if (!stored.length) continue;
    const paths = stored.map(cert => cert.storage_path as string);
    const removed = await client.storage.from('certificates').remove(paths);
    if (removed.error) throw removed.error;
    const cleared = await client.from('certificates').update({ storage_path: null })
      .in('id', stored.map(cert => cert.id)).in('storage_path', paths);
    if (cleared.error) throw cleared.error;
  }
}

export async function bundle(ids: string[]) {
  const documents: Uint8Array[] = [];
  for (const id of ids) documents.push(await storedCertificate(id));
  return mergePdfBytes(documents);
}
