import { describe, expect, it } from 'vitest';
import {
  buildInternationalPhone,
  DEFAULT_COUNTRY_CODE,
  formatCoordinates,
  isCoordinatesInputValid,
  isInternationalPhoneInputValid,
  parseCoordinatesInput,
  splitInternationalPhone,
} from './contact-input';

describe('captura de teléfono internacional', () => {
  it('usa +52 únicamente como valor visible inicial', () => {
    expect(splitInternationalPhone(null)).toEqual({
      countryCode: DEFAULT_COUNTRY_CODE,
      nationalNumber: '',
    });
  });

  it('separa números E.164 mexicanos y de otros países', () => {
    expect(splitInternationalPhone('+526671234567')).toEqual({
      countryCode: '+52',
      nationalNumber: '6671234567',
    });
    expect(splitInternationalPhone('+351211234567')).toEqual({
      countryCode: '+351',
      nationalNumber: '211234567',
    });
  });

  it('normaliza espacios, guiones y paréntesis al guardar', () => {
    expect(buildInternationalPhone('+52', '667 123 45 67')).toBe('+526671234567');
    expect(buildInternationalPhone('+1', '(415) 555-2671')).toBe('+14155552671');
    expect(buildInternationalPhone('+52', '')).toBeNull();
  });

  it('rechaza letras, códigos incompletos y longitudes E.164 inválidas', () => {
    expect(isInternationalPhoneInputValid('+52', '667 ABC 4567')).toBe(false);
    expect(isInternationalPhoneInputValid('52', '6671234567')).toBe(false);
    expect(isInternationalPhoneInputValid('+52', '123')).toBe(false);
  });
});

describe('captura de coordenadas', () => {
  it('acepta el valor copiado de Google Maps y redondea a seis decimales', () => {
    expect(parseCoordinatesInput('24.782805612467623, -107.43111031811513')).toEqual({
      latitude: 24.782806,
      longitude: -107.43111,
    });
  });

  it('acepta espacios y coordenadas negativas', () => {
    expect(parseCoordinatesInput('  -24.5 ,  -107.25  ')).toEqual({
      latitude: -24.5,
      longitude: -107.25,
    });
  });

  it('rechaza formato incompleto y valores fuera de rango', () => {
    expect(isCoordinatesInputValid('')).toBe(true);
    expect(isCoordinatesInputValid('24.7')).toBe(false);
    expect(isCoordinatesInputValid('91, -107')).toBe(false);
    expect(isCoordinatesInputValid('24, -181')).toBe(false);
  });

  it('reconstruye el campo desde las columnas persistidas', () => {
    expect(formatCoordinates('24.782806', '-107.431110')).toBe('24.782806, -107.431110');
    expect(formatCoordinates(null, null)).toBe('');
  });
});
