# Trato

Base de una aplicación web privada para administrar clientes y prospectos por proyecto comercial.

## Requisitos

- Node.js 24 LTS (24.15 o posterior)
- npm 11
- Docker con Docker Compose

## Puesta en marcha

1. Crea la configuración local:

   ```bash
   cp .env.example .env
   ```

2. Instala las dependencias y genera el cliente de Prisma:

   ```bash
   npm install
   npm run prisma:generate
   ```

3. Inicia PostgreSQL:

   ```bash
   npm run db:up
   ```

4. Aplica las migraciones y, opcionalmente, carga datos ficticios:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

   El seed crea dos carteras separadas, no contiene credenciales y se bloquea cuando `NODE_ENV=production`.

5. Crea la credencial del usuario inicial desde una terminal interactiva:

   ```bash
   npm run user:create
   ```

   Si cargaste el seed, usa el correo `desarrollo@trato.local` para asignar la contraseña al usuario ficticio. Sin seed, el comando crea el primer usuario. Pide la contraseña sin mostrarla, exige al menos 12 caracteres y no acepta credenciales como argumentos. Si ya existe un usuario con otro correo, se detiene para no crear una cuenta adicional por accidente.

6. Inicia la API y el frontend en dos terminales:

   ```bash
   npm run dev:api
   npm run dev:web
   ```

La web queda disponible en <http://localhost:4200>; Angular reenvía `/api` a NestJS durante el desarrollo. El endpoint de salud está en <http://localhost:3000/api/health>.

Una respuesta saludable tiene esta forma:

```json
{
  "status": "ok",
  "database": "up",
  "timestamp": "2026-10-21T18:00:00.000Z",
  "timezone": "America/Mazatlan"
}
```

## Verificación

```bash
npm run prisma:validate
npm run db:deploy
npm run lint
npm test
npm run build
```

Las pruebas de autorización usan una base exclusiva y ya migrada, nunca una base con datos reales:

```bash
createdb trato_e2e
DATABASE_URL=postgresql://TU_USUARIO@localhost:5432/trato_e2e npm run db:deploy
TEST_DATABASE_URL=postgresql://TU_USUARIO@localhost:5432/trato_e2e npm run test:e2e --workspace @trato/api
dropdb trato_e2e
```

La suite e2e limpia por completo la base indicada en `TEST_DATABASE_URL` antes de preparar sus casos. Comprueba acceso anónimo, aislamiento entre usuarios y proyectos, registros cruzados, actividades, tareas, CSRF, limitación de intentos y cierre de sesión.

La prueba integral del endpoint requiere que PostgreSQL esté activo:

```bash
curl http://localhost:3000/api/health
```

Los vencimientos de seguimiento son fechas de calendario (`YYYY-MM-DD`) sin hora. Las actividades del historial sí usan marcas de tiempo. La próxima acción se obtiene ordenando las tareas pendientes por la fecha de vencimiento más cercana; no existe una agenda global.

## Sesiones en producción

Sirve la web y la API bajo el mismo sitio HTTPS, configura `NODE_ENV=production` y establece `WEB_ORIGIN` con el origen público exacto (esquema, host y puerto). En producción la cookie lleva `Secure` y el prefijo `__Host-`. `SESSION_TTL_DAYS` controla su vigencia (7 días por defecto; máximo 30). Los tokens de sesión se almacenan con hash en PostgreSQL y cerrar sesión los revoca.

No ejecutes `db:seed` en producción. Después de desplegar migraciones, crea el usuario mediante `npm run user:create` directamente en una terminal segura del servidor.

## Estructura

```text
apps/
  api/    API REST con NestJS y Prisma
  web/    Aplicación Angular con Angular Material
docs/
  producto.md
  avance.md
```

Antes de comenzar otra etapa se deben leer `docs/producto.md`, `docs/avance.md` y el código existente.
