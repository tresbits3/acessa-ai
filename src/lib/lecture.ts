import { z } from 'zod';
import { db } from './db';
import { normalizeName, nameKey, normalizePhone, contactKey } from './identity';
export const enrollmentSchema=z.object({name:z.string().min(3).max(180),phone:z.string().min(10).max(30),email:z.union([z.email(),z.literal('')]).optional()});
export async function registerLecture(id:string, input: unknown) {
  const parsed=enrollmentSchema.parse(input); const fullName=normalizeName(parsed.name); const phone=normalizePhone(parsed.phone);
  const {data,error}=await db().rpc('register_lecture',{p_lecture_id:id,p_name:fullName,p_name_key:nameKey(fullName),p_phone:phone,p_phone_hash:contactKey(phone),p_email:parsed.email||null});
  if(error) throw new Error(error.message);
  return data[0] as {certificate_id:string;participant_id:string;created:boolean};
}
