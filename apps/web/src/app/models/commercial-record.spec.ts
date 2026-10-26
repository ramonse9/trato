import { describe, expect, it } from 'vitest';
import { COMMERCIAL_STAGES, INTEREST_LEVELS, interestLabel, stageLabel } from './commercial-record';

describe('etiquetas comerciales numeradas', () => {
  it('numera las etapas desde cero en su orden comercial', () => {
    expect(COMMERCIAL_STAGES.map((stage) => stage.label)).toEqual([
      '0 - Por contactar',
      '1 - Buscando al encargado',
      '2 - Contactado',
      '3 - Demo pendiente',
      '4 - Demo realizada',
      '5 - Propuesta enviada',
      '6 - En negociación',
      '7 - Cliente',
      '8 - Descartado',
    ]);
    expect(stageLabel('CLIENTE')).toBe('7 - Cliente');
  });

  it('numera los niveles de interés desde cero', () => {
    expect(INTEREST_LEVELS.map((interest) => interest.label)).toEqual([
      '0 - Sin evaluar',
      '1 - Bajo',
      '2 - Medio',
      '3 - Alto',
    ]);
    expect(interestLabel('ALTO')).toBe('3 - Alto');
  });
});
