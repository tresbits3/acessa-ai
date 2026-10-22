"""Derive clean one-page bases directly from the approved previews."""
from pathlib import Path
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ContentStream, DecodedStreamObject, NameObject

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "models"
ASSETS = ROOT / "assets"
OUT.mkdir(exist_ok=True)
ASSETS.mkdir(exist_ok=True)

for kind in ("palestra", "minicurso"):
    reader = PdfReader(ROOT / "referencias" / f"previa_certificado_{kind}.pdf")
    if len(reader.pages) != 1:
        raise ValueError("A prévia deve ter uma página")
    page = reader.pages[0]
    stream = ContentStream(page.get_contents(), reader)
    result = []
    text_ops = []
    in_text = False
    for operands, operator in stream.operations:
        if operator == b"BT":
            in_text = True
            text_ops = [(operands, operator)]
        elif in_text:
            text_ops.append((operands, operator))
            if operator == b"ET":
                in_text = False
                tm = next((op for op, code in text_ops if code == b"Tm"), None)
                x = float(tm[4]) if tm else -1
                y = float(tm[5]) if tm else -1
                illustrative = (
                    abs(y - 249.2756) < 1 or
                    abs(y - 208.2756) < 1 or
                    abs(y - 190.2756) < 1 or
                    (abs(y - 79) < 1 and x > 500) or
                    (abs(y - 43) < 1 and x > 600)
                )
                if not illustrative:
                    result.extend(text_ops)
        elif operator == b"Do" and "10ec3644" in str(operands[0]):
            continue
        else:
            result.append((operands, operator))
    stream.operations = result
    new_stream = DecodedStreamObject()
    new_stream.set_data(stream.get_data())
    page[NameObject("/Contents")] = new_stream
    xobjects = page[NameObject("/Resources")][NameObject("/XObject")].get_object()
    for key in list(xobjects.keys()):
        if "10ec3644" in str(key):
            del xobjects[key]
    writer = PdfWriter()
    writer.add_page(page)
    writer.add_metadata({"/Title": f"Modelo limpo - {kind}"})
    with (OUT / f"modelo-{kind}.pdf").open("wb") as file:
        writer.write(file)
    if kind == "palestra":
        images = list(page.images)
        (ASSETS / "assinatura-coordenador.png").write_bytes(images[0].data)
        (ASSETS / "logo-unifsp.png").write_bytes(images[1].data)
        (ASSETS / "brasao-fisioterapia.png").write_bytes(images[2].data)
