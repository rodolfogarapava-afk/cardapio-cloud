import type { AvailabilitySchedule } from '@/types';

export const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const DEFAULT_SCHEDULE: AvailabilitySchedule = {
  alwaysWhenOpen: true,
  days: [0, 1, 2, 3, 4, 5, 6],
  startTime: '08:00',
  endTime: '22:00',
};

/**
 * True se a janela cobre o momento atual (ou se estiver ausente / marcada como "sempre").
 */
export function isWithinSchedule(
  schedule?: AvailabilitySchedule,
  now: Date = new Date(),
): boolean {
  if (!schedule) return true;
  if (schedule.alwaysWhenOpen) return true;
  const day = now.getDay();
  if (!schedule.days.includes(day)) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = schedule.startTime.split(':').map(Number);
  const [eh, em] = schedule.endTime.split(':').map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (end <= start) {
    // janela que vira o dia (ex.: 22:00 → 02:00)
    return cur >= start || cur <= end;
  }
  return cur >= start && cur <= end;
}

/** Descrição curta amigável, ex.: "Seg–Sex · 08:00–13:00" ou "Sempre que aberto". */
export function describeSchedule(s?: AvailabilitySchedule): string {
  if (!s || s.alwaysWhenOpen) return 'Sempre que a loja estiver aberta';
  const days = [...s.days].sort((a, b) => a - b);
  let label: string;
  if (days.length === 7) label = 'Todos os dias';
  else if (
    days.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => days.includes(d))
  )
    label = 'Seg–Sex';
  else if (days.length === 2 && days.includes(0) && days.includes(6))
    label = 'Sáb–Dom';
  else label = days.map((d) => DAY_LABELS[d]).join(', ');
  return `${label} · ${s.startTime}–${s.endTime}`;
}
