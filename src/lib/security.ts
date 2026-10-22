import { origin } from './config';
export function adminPost(request: Request) {
  if(request.headers.get('origin')!==origin()) return Response.json({error:'Origem inválida.'},{status:403});
  return null;
}
