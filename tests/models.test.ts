import { describe, it, expect } from 'vitest';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { PDFDocument, PDFName } from 'pdf-lib';
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

      const student = 'PESSOA DE TESTE';
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

  it('desenha nomes em maiúsculas, sem separar letras e preservando acentos', async () => {
    const names = [
      'Ana',
      'joão correa',
      'Érica de Ávila',
      'Maria Fernanda Correa de Ávila e Albuquerque dos Santos Pereira da Costa',
    ];

    for (const [kind, certificateKind] of [['palestra', 'lecture'], ['minicurso', 'workshop']] as const) {
      for (const [index, savedName] of names.entries()) {
        const id = `${certificateKind === 'lecture' ? '11111111-1111-4111-8111' : '22222222-2222-4222-8222'}-${String(index + 1).padStart(12, '0')}`;
        const generated = await renderCertificate({
          id,
          kind: certificateKind,
          student: savedName,
          title: 'Atividade de teste',
          instructor: 'Docente de teste',
          eventDate: '2026-10-22',
        });
        const generatedText = await visibleText(generated);
        const words = savedName.toLocaleUpperCase('pt-BR').split(/\s+/);
        let previousIndex = -1;
        for (const word of words) {
          const currentIndex = generatedText.indexOf(word, previousIndex + 1);
          expect(currentIndex, `${kind}: ${word} em ${savedName}`).toBeGreaterThan(previousIndex);
          previousIndex = currentIndex;
        }
        expect(generatedText).not.toContain('COR REA');
        await mkdir('tmp/pdfs', { recursive: true });
        await writeFile(`tmp/pdfs/exemplo-${kind}-nome-${index + 1}.pdf`, generated);
      }
    }
  });

  it('os dois modelos incorporam a logo com máscara de transparência', async () => {
    for (const kind of ['palestra', 'minicurso']) {
      const model = await PDFDocument.load(await readFile(`models/modelo-${kind}.pdf`));
      type TestDictionary = {
        entries(): Array<[PDFName, unknown]>;
        lookup(key: PDFName): { asNumber(): number };
        has(key: PDFName): boolean;
      };
      const resources = model.getPage(0).node.Resources() as unknown as { lookup(key: PDFName): TestDictionary } | undefined;
      const xObjects = resources?.lookup(PDFName.of('XObject'));
      expect(xObjects).toBeDefined();
      const logo = xObjects!.entries()
        .map(([, ref]) => model.context.lookup(ref as never) as unknown as { dict: TestDictionary })
        .find(object => object.dict?.lookup(PDFName.of('Width'))?.asNumber() === 1272
          && object.dict?.lookup(PDFName.of('Height'))?.asNumber() === 671);
      expect(logo?.dict?.has(PDFName.of('SMask'))).toBe(true);
    }
  });
});
