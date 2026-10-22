export type LecturePhase = 'before' | 'today' | 'after';

export function saoPauloDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);
}

export function lecturePhase(eventDate: string, now = new Date()): LecturePhase {
  const today = saoPauloDate(now);
  return today < eventDate ? 'before' : today > eventDate ? 'after' : 'today';
}
