import { config as loadEnv } from 'dotenv';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateEnvironment } from '../src/config/environment.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const root = resolve(process.cwd(), '../..');
const environmentFile = resolve(root, '.env');
loadEnv({ path: environmentFile });

const failures: string[] = [];
const warnings: string[] = [];

try {
  validateEnvironment();
  process.stdout.write('✓ Variables de entorno válidas.\n');
} catch (error) {
  failures.push(
    error instanceof Error ? error.message : 'Configuración inválida.',
  );
}

try {
  const mode = (await stat(environmentFile)).mode & 0o777;
  if ((mode & 0o077) !== 0) {
    failures.push(
      '.env permite lectura a otros usuarios; ejecuta chmod 600 .env.',
    );
  } else {
    process.stdout.write('✓ Permisos de .env restringidos.\n');
  }
} catch {
  failures.push('No fue posible revisar el archivo .env.');
}

const prisma = new PrismaService();
try {
  await prisma.$queryRaw`SELECT 1`;
  process.stdout.write('✓ PostgreSQL responde.\n');

  const [users, projects, records] = await Promise.all([
    prisma.usuario.findMany({
      select: { id: true, passwordHash: true },
    }),
    prisma.proyectoComercial.count(),
    prisma.registroComercial.count(),
  ]);
  if (users.length !== 1) {
    failures.push(`Se esperaba un usuario y existen ${users.length}.`);
  } else if (!users[0]?.passwordHash) {
    failures.push('El usuario inicial todavía no tiene contraseña.');
  } else {
    process.stdout.write('✓ Usuario inicial con credencial configurada.\n');
  }

  if (
    users.some((user) => user.id === '10000000-0000-4000-8000-000000000001')
  ) {
    warnings.push('La base contiene el usuario del seed de desarrollo.');
  }
  process.stdout.write(
    `✓ Inventario: ${projects} proyectos y ${records} registros.\n`,
  );
} catch (error) {
  failures.push(
    `No fue posible comprobar PostgreSQL: ${error instanceof Error ? error.message : 'error desconocido'}`,
  );
} finally {
  await prisma.$disconnect();
}

const port = process.env.API_PORT ?? '3000';
try {
  const response = await fetch(`http://127.0.0.1:${port}/api/health`);
  const body = (await response.json()) as {
    status?: string;
    database?: string;
  };
  if (!response.ok || body.status !== 'ok' || body.database !== 'up') {
    failures.push('El endpoint de salud no reportó una API disponible.');
  } else {
    process.stdout.write('✓ API y conexión de salud disponibles.\n');
  }
} catch {
  failures.push(`La API no responde en el puerto ${port}.`);
}

for (const warning of warnings) process.stdout.write(`! ${warning}\n`);
for (const failure of failures) process.stderr.write(`✗ ${failure}\n`);

if (failures.length > 0) process.exitCode = 1;
else
  process.stdout.write('Trato está listo para uso con esta configuración.\n');
