import {describe,it,expect} from 'vitest';import {previewCsv} from '../src/lib/import';
const header='curso,professor,data,carga_horaria,detalhes,aluno\n';
describe('conferência de importação',()=>{
  it('bloqueia nome repetido no mesmo minicurso',()=>{const p=previewCsv(header+'Curso A,Professora,2026-10-21,4 horas,,Ana Souza\nCurso A,Professora,2026-10-21,4 horas,,ANA SOUZA');expect(p.errors.some(e=>e.includes('nome repetido'))).toBe(true)});
  it('bloqueia professor e data ausentes',()=>{const p=previewCsv(header+'Curso A,,,4 horas,,Ana Souza');expect(p.errors.length).toBeGreaterThan(0)});
  it('separa minicursos e alunos',()=>{const p=previewCsv(header+'Curso A,Professora,2026-10-21,4 horas,,Ana Souza\nCurso B,Professor,2026-10-22,2 horas,,Ana Souza');expect(p.errors).toEqual([]);expect(p.courses).toHaveLength(2)});
});
