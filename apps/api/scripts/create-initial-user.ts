import { config as loadEnv } from 'dotenv';
import { createInterface } from 'node:readline/promises';
import { resolve } from 'node:path';
import { Writable } from 'node:stream';
import { stdin, stdout } from 'node:process';
import { hashPassword } from '../src/auth/password.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

loadEnv({ path: resolve(process.cwd(), '../../.env') });

let hideInput = false;
const hiddenOutput = new Writable({
  write(chunk: Buffer | string, _encoding, callback) {
    if (!hideInput) stdout.write(chunk);
    callback();
  },
});
const prompt = createInterface({
  input: stdin,
  output: hiddenOutput,
  terminal: true,
});

async function ask(label: string, hidden = false): Promise<string> {
  if (hidden) stdout.write(label);
  hideInput = hidden;
  const answer = await prompt.question(hidden ? '' : label);
  hideInput = false;
  if (hidden) stdout.write('\n');
  return answer;
}

async function main(): Promise<void> {
  if (!stdin.isTTY) {
    throw new Error('Este procedimiento requiere una terminal interactiva.');
  }

  const nombre = (await ask('Nombre: ')).trim().normalize('NFC');
  const correo = (await ask('Correo: ')).trim().normalize('NFC').toLowerCase();
  const password = await ask('Contraseña (mínimo 12 caracteres): ', true);
  const confirmation = await ask('Confirma la contraseña: ', true);

  if (!nombre || nombre.length > 120)
    throw new Error('El nombre no es válido.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 254) {
    throw new Error('El correo no es válido.');
  }
  if (password.normalize('NFC').length < 12 || password.length > 128) {
    throw new Error('La contraseña debe tener entre 12 y 128 caracteres.');
  }
  if (password !== confirmation)
    throw new Error('Las contraseñas no coinciden.');

  const prisma = new PrismaService();
  try {
    const users = await prisma.usuario.findMany({
      select: { id: true, correo: true },
    });
    if (
      users.length > 1 ||
      (users.length === 1 && users[0]?.correo !== correo)
    ) {
      throw new Error(
        'Ya existe otro usuario. Este comando solo administra al usuario inicial.',
      );
    }

    const passwordHash = await hashPassword(password);
    const user = users[0]
      ? await prisma.usuario.update({
          where: { id: users[0].id },
          data: { nombre, correo, passwordHash },
          select: { correo: true },
        })
      : await prisma.usuario.create({
          data: { nombre, correo, passwordHash },
          select: { correo: true },
        });

    stdout.write(`Usuario inicial listo: ${user.correo}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

try {
  await main();
} catch (error) {
  const message =
    error instanceof Error ? error.message : 'No fue posible crear el usuario.';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
} finally {
  prompt.close();
}
