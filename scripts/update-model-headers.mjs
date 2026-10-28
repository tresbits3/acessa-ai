import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFArray, PDFDocument, PDFName, PDFRawStream, decodePDFRawStream } from 'pdf-lib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const oldHeading = 'BT\n1 0 0 1 168 526.2756 Tm\n/F2+0 9 Tf\n10.8 TL\n(CURSO DE FISIOTERAPIA) Tj\nT*\nET\n';
const oldSubtitle = '0.32549 0.380392 0.345098 rg\nBT\n1 0 0 1 168 508.2756 Tm\n/F3+0 8 Tf\n9.6 TL\n';
const centeredHeading = '0.72549 0.568627 0.321569 rg\nBT\n1 0 0 1 168 503.2756 Tm\n/F3+0 11 Tf\n13.2 TL\n';

for (const kind of ['palestra', 'minicurso']) {
  const modelPath = path.join(root, 'models', `modelo-${kind}.pdf`);
  const pdf = await PDFDocument.load(await readFile(modelPath));
  const contents = pdf.getPage(0).node.Contents();
  const streams = contents instanceof PDFArray ? contents.asArray() : [contents];
  if (streams.length !== 1) throw new Error(`Estrutura de página inesperada em ${modelPath}`);
  let changed = false;

  for (const ref of streams) {
    const stream = pdf.context.lookup(ref);
    if (!(stream instanceof PDFRawStream)) continue;
    const source = Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1');
    if (!source.includes(oldHeading)) continue;
    if (!source.includes(oldSubtitle)) throw new Error(`Cabeçalho inesperado em ${modelPath}`);
    const updated = source.replace(oldHeading, '').replace(oldSubtitle, centeredHeading);
    const newRef = pdf.context.register(pdf.context.flateStream(Buffer.from(updated, 'latin1')));
    pdf.getPage(0).node.set(PDFName.of('Contents'), newRef);
    pdf.context.delete(ref);
    changed = true;
    break;
  }

  if (changed) await writeFile(modelPath, await pdf.save());
  else {
    const alreadyUpdated = streams.some(ref => {
      const stream = pdf.context.lookup(ref);
      return stream instanceof PDFRawStream && Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1').includes(centeredHeading);
    });
    if (!alreadyUpdated) throw new Error(`Não encontrei o cabeçalho em ${modelPath}`);
    let removedStaleStream = false;
    for (const [ref, object] of pdf.context.enumerateIndirectObjects()) {
      if (object instanceof PDFRawStream && Buffer.from(decodePDFRawStream(object).decode()).toString('latin1').includes(oldHeading)) {
        pdf.context.delete(ref);
        removedStaleStream = true;
      }
    }
    if (removedStaleStream) await writeFile(modelPath, await pdf.save());
  }
}
