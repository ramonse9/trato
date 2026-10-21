import { describe, expect, it } from 'vitest';
import {
  calculateFollowUpStatus,
  calendarDateInMazatlan,
  classifyTaskDate,
} from './follow-up-status.js';

describe('semáforo de seguimiento', () => {
  it('calcula hoy en America/Mazatlan incluso en el límite UTC', () => {
    expect(calendarDateInMazatlan(new Date('2026-10-21T06:59:59.999Z'))).toBe(
      '2026-10-20',
    );
    expect(calendarDateInMazatlan(new Date('2026-10-21T07:00:00.000Z'))).toBe(
      '2026-10-21',
    );
  });

  it('respeta todos los límites del semáforo', () => {
    const today = '2026-10-21';
    expect(calculateFollowUpStatus(null, today)).toBe('GRIS');
    expect(calculateFollowUpStatus('2026-10-20', today)).toBe('ROJO');
    expect(calculateFollowUpStatus('2026-10-21', today)).toBe('AMARILLO');
    expect(calculateFollowUpStatus('2026-10-24', today)).toBe('AMARILLO');
    expect(calculateFollowUpStatus('2026-10-25', today)).toBe('VERDE');
  });

  it('separa hoy de los tres días siguientes', () => {
    const today = '2026-12-30';
    expect(classifyTaskDate('2026-12-29', today)).toBe('VENCIDA');
    expect(classifyTaskDate('2026-12-30', today)).toBe('HOY');
    expect(classifyTaskDate('2027-01-02', today)).toBe('PROXIMOS_TRES_DIAS');
    expect(classifyTaskDate('2027-01-03', today)).toBe('POSTERIOR');
  });
});
