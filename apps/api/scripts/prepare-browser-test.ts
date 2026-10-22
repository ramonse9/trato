import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { hashPassword } from '../src/auth/password.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

loadEnv({ path: resolve(process.cwd(), '../../.env') });

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL es obligatoria para preparar pruebas de navegador.',
  );
}
if (process.env.NODE_ENV !== 'test') {
  throw new Error('NODE_ENV debe ser test para preparar pruebas de navegador.');
}

const databaseName = decodeURIComponent(new URL(databaseUrl).pathname.slice(1));
if (!/(?:^|_)(?:e2e|test)(?:_|$)/iu.test(databaseName)) {
  throw new Error('La base de navegador debe incluir test o e2e en su nombre.');
}

process.env.DATABASE_URL = databaseUrl;

const prisma = new PrismaService();
try {
  const user = await prisma.usuario.findUnique({
    where: { id: '10000000-0000-4000-8000-000000000001' },
    select: { id: true },
  });
  if (!user) {
    throw new Error(
      'Ejecuta el seed de desarrollo antes de preparar el navegador.',
    );
  }

  await prisma.$transaction([
    prisma.sesion.deleteMany({ where: { usuarioId: user.id } }),
    prisma.usuario.update({
      where: { id: user.id },
      data: {
        nombre: 'Usuario de navegador',
        correo: 'navegador@trato.test',
        passwordHash: await hashPassword('trato-navegador-2026'),
      },
    }),
  ]);
  process.stdout.write(`Base de navegador preparada: ${databaseName}\n`);
} finally {
  await prisma.$disconnect();
}
