export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  return Response.redirect(new URL(`/api/lectures/${id}/register`, request.url), 307);
}
