import { describe, expect, it } from 'vitest';
import { lecturePhase, saoPauloDate } from '../src/lib/lecture-date';

describe('data da palestra em São Paulo', () => {
  it('distingue antes, no dia e depois mesmo na virada UTC', () => {
    const date = '2026-10-22';
    expect(lecturePhase(date, new Date('2026-10-22T02:59:59Z'))).toBe('before');
    expect(lecturePhase(date, new Date('2026-10-22T03:00:00Z'))).toBe('today');
    expect(lecturePhase(date, new Date('2026-10-23T02:59:59Z'))).toBe('today');
    expect(lecturePhase(date, new Date('2026-10-23T03:00:00Z'))).toBe('after');
    expect(saoPauloDate(new Date('2026-10-22T03:00:00Z'))).toBe(date);
  });
});
