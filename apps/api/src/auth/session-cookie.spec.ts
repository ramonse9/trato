import { sessionCookieName, sessionCookieOptions } from './session-cookie.js';

describe('session cookie', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('activa Secure y el prefijo __Host- en producción', () => {
    process.env.NODE_ENV = 'production';
    const options = sessionCookieOptions(new Date('2030-01-01T00:00:00Z'));

    expect(sessionCookieName()).toBe('__Host-trato_session');
    expect(options).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
  });
});
