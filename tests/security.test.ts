import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminPost } from '../src/lib/security';

afterEach(() => vi.unstubAllEnvs());

describe('operações do painel', () => {
  it('aceita uma escrita da origem configurada sem sessão administrativa', () => {
    vi.stubEnv('APP_ORIGIN', 'https://evento.example');
    vi.stubEnv('ADMIN_LINK_SECRET', '');
    vi.stubEnv('SESSION_SECRET', '');
    const request = new Request('https://evento.example/api/admin/lectures', {
      method: 'POST',
      headers: { Origin: 'https://evento.example' },
    });

    expect(adminPost(request)).toBeNull();
  });

  it('recusa uma escrita iniciada em outro site', () => {
    vi.stubEnv('APP_ORIGIN', 'https://evento.example');
    const request = new Request('https://evento.example/api/admin/lectures', {
      method: 'POST',
      headers: { Origin: 'https://outro.example' },
    });

    expect(adminPost(request)?.status).toBe(403);
  });
});
