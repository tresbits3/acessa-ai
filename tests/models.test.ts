import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { renderCertificate } from '../src/lib/pdf-render';

async function visibleText(bytes: Uint8Array) {
  const pdf = await getDocument({
    data: new Uint8Array(bytes),
    standardFontDataUrl: new URL('../node_modules/pdfjs-dist/standard_fonts/', import.meta.url).href,
  }).promise;
  try {
    const pages: string[] = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const content = await (await pdf.getPage(number)).getTextContent();
      pages.push(content.items.map(item => 'str' in item ? item.str : '').join(' '));
    }
    return pages.join(' ');
  } finally {
    await pdf.destroy();
  }
}

const academicRecordField = /\b(?:registro\s+acad[eê]mico|R\s*\.?\s*A\b)/i;

describe('modelos e certificados', () => {
  for (const [kind, certificateKind] of [['palestra', 'lecture'], ['minicurso', 'workshop']] as const) {
    it(`${kind}: modelo e PDF gerado têm uma página e não exibem registro acadêmico`, async () => {
      const model = await readFile(`models/modelo-${kind}.pdf`);
      expect((await PDFDocument.load(model)).getPageCount()).toBe(1);
      const modelText = await visibleText(model);
      expect(modelText).toContain('CERTIFICADO DE PARTICIPAÇÃO');
      expect(modelText).not.toMatch(academicRecordField);

      const student = 'Pessoa de Teste';
      const generated = await renderCertificate({
        id: certificateKind === 'lecture'
          ? '11111111-1111-4111-8111-111111111111'
          : '22222222-2222-4222-8222-222222222222',
        kind: certificateKind,
        student,
        title: 'Atividade de teste',
        instructor: 'Docente de teste',
        eventDate: '2026-10-22',
      });
      expect((await PDFDocument.load(generated)).getPageCount()).toBe(1);
      const generatedText = await visibleText(generated);
      expect(generatedText).toContain(student);
      expect(generatedText).toContain('ATIVIDADE DE TESTE');
      expect(generatedText).not.toMatch(academicRecordField);
    });
  }
});
