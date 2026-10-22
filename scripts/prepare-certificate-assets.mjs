import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFName } from 'pdf-lib';
import { PNG } from 'pngjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logoPath = path.join(root, 'assets', 'logo-unifsp.png');
const originalLogo = PNG.sync.read(await readFile(logoPath));

if (!originalLogo.data.some((_, index) => index % 4 === 3 && originalLogo.data[index] < 255)) {
  for (let index = 0; index < originalLogo.data.length; index += 4) {
    const red = originalLogo.data[index];
    const green = originalLogo.data[index + 1];
    const blue = originalLogo.data[index + 2];
    const alpha = 255 - Math.min(red, green, blue);
    originalLogo.data[index + 3] = alpha < 8 ? 0 : alpha;
    if (alpha >= 8 && alpha < 255) {
      originalLogo.data[index] = Math.min(255, Math.max(0, Math.round((red - 255 + alpha) * 255 / alpha)));
      originalLogo.data[index + 1] = Math.min(255, Math.max(0, Math.round((green - 255 + alpha) * 255 / alpha)));
      originalLogo.data[index + 2] = Math.min(255, Math.max(0, Math.round((blue - 255 + alpha) * 255 / alpha)));
    }
  }
  await writeFile(logoPath, PNG.sync.write(originalLogo));
}

const transparentLogo = await readFile(logoPath);
for (const kind of ['palestra', 'minicurso']) {
  const modelPath = path.join(root, 'models', `modelo-${kind}.pdf`);
  const pdf = await PDFDocument.load(await readFile(modelPath));
  const logoImage = await pdf.embedPng(transparentLogo);
  const page = pdf.getPage(0);
  const xObjects = page.node.Resources().lookup(PDFName.of('XObject'));
  let replaced = false;

  for (const [name, reference] of xObjects.entries()) {
    const object = pdf.context.lookup(reference);
    const width = object.dict?.lookup(PDFName.of('Width'))?.asNumber();
    const height = object.dict?.lookup(PDFName.of('Height'))?.asNumber();
    if (width === originalLogo.width && height === originalLogo.height) {
      xObjects.set(name, logoImage.ref);
      replaced = true;
      break;
    }
  }

  if (!replaced) throw new Error(`Não encontrei o recurso da logo em ${modelPath}`);
  await writeFile(modelPath, await pdf.save());
}
