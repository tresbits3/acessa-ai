import { createHash } from 'node:crypto';
import type { CertificateData } from './pdf-render';

export function certificateFile(data: CertificateData & { revision: number }, renderVersion = process.env.CERTIFICATE_RENDER_VERSION ?? 'development') {
  const content = [renderVersion, data.kind, data.student, data.title, data.instructor,
    data.eventDate, data.workload ?? null, data.details ?? null];
  const digest = createHash('sha256').update(JSON.stringify(content)).digest('hex').slice(0, 24);
  return `${data.id}-v${data.revision}-${digest}.pdf`;
}
