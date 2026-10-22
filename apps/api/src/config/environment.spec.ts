import { validateEnvironment } from './environment.js';

const validEnvironment = {
  NODE_ENV: 'production',
  DATABASE_URL:
    'postgresql://trato:secret@example.com:5432/trato?schema=public',
  API_PORT: '3000',
  WEB_ORIGIN: 'https://trato.example.com',
  SESSION_TTL_DAYS: '7',
  TZ: 'America/Mazatlan',
};

describe('configuración de entorno', () => {
  it('acepta una configuración completa de producción', () => {
    expect(() => validateEnvironment(validEnvironment)).not.toThrow();
  });

  it('exige HTTPS y origen exacto en producción', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        WEB_ORIGIN: 'http://trato.example.com',
      }),
    ).toThrow('HTTPS');
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        WEB_ORIGIN: 'https://trato.example.com/app',
      }),
    ).toThrow('origen exacto');
  });

  it('rechaza secretos o parámetros operativos ausentes o inválidos', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, DATABASE_URL: '' }),
    ).toThrow('DATABASE_URL');
    expect(() =>
      validateEnvironment({ ...validEnvironment, SESSION_TTL_DAYS: '31' }),
    ).toThrow('SESSION_TTL_DAYS');
    expect(() =>
      validateEnvironment({ ...validEnvironment, API_PORT: '70000' }),
    ).toThrow('API_PORT');
  });
});
