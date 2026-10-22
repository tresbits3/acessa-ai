import { createHmac } from 'node:crypto';
import { longSecret } from './config';
export function normalizeName(value: string) { return value.normalize('NFKC').trim().replace(/\s+/g, ' '); }
export function nameKey(value: string) { return normalizeName(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR'); }
export function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) digits = digits.slice(2);
  if (digits.length !== 11 || digits[2] !== '9') throw new Error('Informe um celular brasileiro válido com DDD.');
  return `55${digits}`;
}
export function contactKey(phone: string) { return createHmac('sha256', longSecret('CONTACT_HASH_SECRET')).update(phone).digest('hex'); }
