export function error(message: string, status = 400) { return Response.json({ error: message }, { status }); }
export function pdfResponse(bytes: Uint8Array, filename: string, inline = false) {
  return new Response(Buffer.from(bytes), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename}"`, 'Cache-Control': 'private, no-store' } });
}
export function pdfStreamResponse(bytes:Uint8Array,filename:string,inline=false){
  let offset=0;const stream=new ReadableStream<Uint8Array>({pull(controller){if(offset>=bytes.length){controller.close();return}const end=Math.min(offset+64*1024,bytes.length);controller.enqueue(bytes.slice(offset,end));offset=end}});
  return new Response(stream,{headers:{'Content-Type':'application/pdf','Content-Disposition':`${inline?'inline':'attachment'}; filename="${filename}"`,'Cache-Control':'private, no-store'}});
}
