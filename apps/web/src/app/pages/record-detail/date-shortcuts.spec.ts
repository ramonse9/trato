import { describe, expect, it } from 'vitest';
import {
  addCalendarDays,
  addCalendarMonth,
  calendarToday,
  dateTimeNow,
  mazatlanDateTimeToIso,
} from './date-shortcuts';

describe('atajos de fecha', () => {
  it('calcula mañana y una semana como fechas de calendario', () => {
    expect(addCalendarDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addCalendarDays('2026-12-28', 7)).toBe('2027-01-04');
  });

  it('ajusta un mes al último día válido', () => {
    expect(addCalendarMonth('2026-01-31')).toBe('2026-02-28');
    expect(addCalendarMonth('2024-01-31')).toBe('2024-02-29');
    expect(addCalendarMonth('2026-03-30')).toBe('2026-04-30');
  });

  it('crea valores locales en America/Mazatlan', () => {
    const instant = new Date('2026-10-21T14:05:00.000Z');
    expect(calendarToday(instant)).toBe('2026-10-21');
    expect(dateTimeNow(instant)).toBe('2026-10-21T07:05');
    expect(mazatlanDateTimeToIso('2026-10-21T07:05')).toBe('2026-10-21T14:05:00.000Z');
  });
});
