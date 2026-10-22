import { describe,it,expect } from 'vitest';
import { normalizeName,nameKey,normalizePhone } from '../src/lib/identity';
describe('identificação',()=>{
  it('normaliza celular com ou sem código do país',()=>{expect(normalizePhone('(11) 98888-7777')).toBe('5511988887777');expect(normalizePhone('+55 11 98888-7777')).toBe('5511988887777')});
  it('recusa celular incompleto',()=>expect(()=>normalizePhone('123')).toThrow());
  it('compara nomes sem diferenças de acento, caixa e espaços',()=>expect(nameKey(normalizeName('  José   da SILVA '))).toBe(nameKey('jose da silva')));
});
