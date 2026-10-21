export const APPLICATION_TIME_ZONE = 'America/Mazatlan';

export type FollowUpStatus = 'ROJO' | 'AMARILLO' | 'VERDE' | 'GRIS';
export type TodayTaskGroup =
  'VENCIDA' | 'HOY' | 'PROXIMOS_TRES_DIAS' | 'POSTERIOR';

export function calendarDateInMazatlan(instant = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APPLICATION_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function calendarDateValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addCalendarDays(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

export function classifyTaskDate(
  dueDate: string,
  today = calendarDateInMazatlan(),
): TodayTaskGroup {
  if (dueDate < today) return 'VENCIDA';
  if (dueDate === today) return 'HOY';
  if (dueDate <= addCalendarDays(today, 3)) return 'PROXIMOS_TRES_DIAS';
  return 'POSTERIOR';
}

export function calculateFollowUpStatus(
  dueDate: string | null,
  today = calendarDateInMazatlan(),
): FollowUpStatus {
  if (!dueDate) return 'GRIS';
  const group = classifyTaskDate(dueDate, today);
  if (group === 'VENCIDA') return 'ROJO';
  if (group === 'HOY' || group === 'PROXIMOS_TRES_DIAS') return 'AMARILLO';
  return 'VERDE';
}
