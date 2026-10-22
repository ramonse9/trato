type Environment = NodeJS.ProcessEnv;

export function validateEnvironment(
  environment: Environment = process.env,
): void {
  const nodeEnvironment = environment.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(nodeEnvironment)) {
    throw new Error('NODE_ENV debe ser development, test o production.');
  }

  const databaseUrl = environment.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL es obligatoria.');
  const database = parseUrl(databaseUrl, 'DATABASE_URL');
  if (!['postgres:', 'postgresql:'].includes(database.protocol)) {
    throw new Error('DATABASE_URL debe usar PostgreSQL.');
  }

  const port = environment.API_PORT ?? '3000';
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65_535) {
    throw new Error('API_PORT debe ser un puerto válido.');
  }

  const ttl = environment.SESSION_TTL_DAYS ?? '7';
  if (!/^\d+$/.test(ttl) || Number(ttl) < 1 || Number(ttl) > 30) {
    throw new Error('SESSION_TTL_DAYS debe estar entre 1 y 30.');
  }

  const timeZone = environment.TZ ?? 'America/Mazatlan';
  if (timeZone !== 'America/Mazatlan') {
    throw new Error('TZ debe ser America/Mazatlan.');
  }

  const webOrigin =
    environment.WEB_ORIGIN ??
    (nodeEnvironment === 'production' ? '' : 'http://localhost:4200');
  if (!webOrigin) throw new Error('WEB_ORIGIN es obligatoria en producción.');
  const origin = parseUrl(webOrigin, 'WEB_ORIGIN');
  if (
    origin.origin !== webOrigin ||
    !['http:', 'https:'].includes(origin.protocol)
  ) {
    throw new Error('WEB_ORIGIN debe contener únicamente el origen exacto.');
  }
  if (nodeEnvironment === 'production' && origin.protocol !== 'https:') {
    throw new Error('WEB_ORIGIN debe usar HTTPS en producción.');
  }
}

function parseUrl(value: string, variable: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${variable} no contiene una URL válida.`);
  }
}
