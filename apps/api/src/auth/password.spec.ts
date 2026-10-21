import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('guarda un hash con sal y verifica sin conservar la contraseña', async () => {
    const password = 'frase-segura-de-prueba';
    const encoded = await hashPassword(password);

    expect(encoded).not.toContain(password);
    await expect(verifyPassword(password, encoded)).resolves.toBe(true);
    await expect(verifyPassword('otra-frase-segura', encoded)).resolves.toBe(
      false,
    );
  });
});
