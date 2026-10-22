import { isAdmin, adminResponse } from './admin';
import { origin } from './config';
export async function adminPost(request: Request) {
  if(!(await isAdmin())) return adminResponse();
  if(request.headers.get('origin')!==origin()) return Response.json({error:'Origem inválida.'},{status:403});
  return null;
}
