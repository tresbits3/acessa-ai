import { z } from 'zod';
import { normalizeName, nameKey } from './identity';

export const workshopSchema = z.object({
  title: z.string().min(2).max(180),
  teacher: z.string().min(2).max(180),
  event_date: z.iso.date(),
  workload: z.string().max(80)
});
export const studentSchema = z.object({ name: z.string().min(2).max(180) });
export function checkedName(value: string) {
  const name = normalizeName(value);
  if (name.length < 2 || name.length > 180) throw new Error('Informe o nome completo do aluno.');
  return { name, key: nameKey(name) };
}
export function databaseError(error: { code?: string; message: string }) {
  return error.code === '23505' ? 'Já existe um aluno ativo com esse nome neste minicurso.' : error.message;
}
