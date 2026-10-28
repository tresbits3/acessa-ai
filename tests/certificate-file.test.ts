import { describe, expect, it } from 'vitest';
import { certificateFile } from '../src/lib/certificate-file';

const certificate = {
  id: '11111111-1111-4111-8111-111111111111', kind: 'workshop' as const,
  student: 'Aluno de teste', title: 'Minicurso original', instructor: 'Docente de teste',
  eventDate: '2026-10-22', workload: '4 horas', details: null, revision: 1
};

describe('arquivo de certificado', () => {
  it('mantém o endereço para os mesmos dados e muda para qualquer informação impressa', () => {
    const original = certificateFile(certificate);
    expect(certificateFile({ ...certificate })).toBe(original);
    for (const change of [
      { title: 'Minicurso atualizado' }, { instructor: 'Outra docente' },
      { student: 'Outra pessoa' }, { eventDate: '2026-10-23' },
      { workload: '8 horas' }, { details: 'Novo detalhe' },
      { kind: 'lecture' as const }, { revision: 2 }
    ]) expect(certificateFile({ ...certificate, ...change })).not.toBe(original);
    expect(certificateFile(certificate, 'novo-modelo')).not.toBe(original);
  });
});
