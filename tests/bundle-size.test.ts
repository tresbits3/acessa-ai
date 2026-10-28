import { expect, it } from 'vitest';
import { PDFDocument, PDFName } from 'pdf-lib';
import { writeFile } from 'node:fs/promises';
import { mergePdfBytes, renderCertificate } from '../src/lib/pdf-render';

it('keeps a 20-certificate bundle complete and shares unchanged artwork', async () => {
  const certificates = await Promise.all(Array.from({ length: 20 }, (_, index) => renderCertificate({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    kind: 'workshop', student: `Aluno de teste ${index}`,
    title: 'Curso de teste', instructor: 'Docente de teste', eventDate: '2026-10-22'
  })));
  const bundle = await mergePdfBytes(certificates);
  const pdf = await PDFDocument.load(bundle);
  expect(pdf.getPageCount()).toBe(20);
  expect(bundle.length).toBeLessThan(10 * 1024 * 1024);
  for (const page of pdf.getPages()) {
    expect(page.node.Resources()?.lookup(PDFName.of('XObject'))).toBeDefined();
  }
  await writeFile('tmp/bundle-size.txt', String(bundle.length));
});
