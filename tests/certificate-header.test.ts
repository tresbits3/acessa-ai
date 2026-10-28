import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { renderCertificate } from '../src/lib/pdf-render';

for (const kind of ['lecture', 'workshop'] as const) {
  it(`uses the centered symposium heading in ${kind} certificates`, async () => {
    const model = kind === 'lecture' ? 'palestra' : 'minicurso';
    const certificate = await renderCertificate({
      id: kind === 'lecture' ? '11111111-1111-4111-8111-111111111111' : '22222222-2222-4222-8222-222222222222',
      kind, student: 'Aluno de teste', title: 'Atividade de teste',
      instructor: 'Docente de teste', eventDate: '2026-10-22'
    });
    for (const bytes of [await readFile(`models/modelo-${model}.pdf`), certificate]) {
      const pdf = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
      expect(pdf.numPages).toBe(1);
      const page = await pdf.getPage(1);
      const text = (await page.getTextContent()).items.filter(item => 'str' in item);
      expect(text.some(item => item.str === 'CURSO DE FISIOTERAPIA')).toBe(false);
      const heading = text.filter(item => item.str === 'III SIMPÓSIO DE FISIOTERAPIA');
      expect(heading).toHaveLength(1);
      expect(heading[0].transform[4]).toBe(168);
      expect(heading[0].transform[5]).toBe(503.2756);
      expect(text.some(item => item.str === 'CERTIFICADO DE PARTICIPAÇÃO')).toBe(true);
      await pdf.destroy();
    }
  });
}
