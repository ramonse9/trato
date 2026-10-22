# Operación de Trato

Esta guía cubre desarrollo, despliegue, migraciones, secretos, respaldo, restauración y comprobaciones. Los comandos se ejecutan desde la raíz del repositorio.

## Desarrollo local

### Requisitos

- Node.js 24.15 o posterior dentro de la línea 24 LTS.
- npm 11.
- PostgreSQL 17 o 18.
- Docker Compose es opcional; también puede utilizarse PostgreSQL instalado con Homebrew o por otro medio.

### Primera instalación

1. Copia `.env.example` a `.env` y usa credenciales exclusivas para la base `trato`.
2. Instala y genera el cliente:

   ```bash
   npm install
   npm run prisma:generate
   ```

3. Inicia PostgreSQL. Con Docker:

   ```bash
   npm run db:up
   ```

   Con PostgreSQL local, crea un rol y una base separados de otras aplicaciones:

   ```bash
   createuser --login --pwprompt trato
   createdb --owner=trato trato
   ```

4. Aplica las migraciones y, solo en desarrollo, carga datos ficticios:

   ```bash
   npm run db:deploy
   npm run db:seed
   ```

5. Crea o actualiza el único usuario inicial mediante el prompt protegido:

   ```bash
   npm run user:create
   ```

   El procedimiento no acepta la contraseña como argumento ni la guarda en archivos. Si existe únicamente el usuario del seed y todavía no tiene contraseña, permite reemplazar su nombre y correo conservando los proyectos ficticios.

6. Inicia API y web en terminales distintas:

   ```bash
   npm run dev:api
   npm run dev:web
   ```

La web queda en `http://localhost:4200` y la API en `http://localhost:3000/api`.

## Verificación previa a una entrega

```bash
npm run verify
npm run db:status
curl --fail http://localhost:3000/api/health
npm run ready:check
```

Las pruebas e2e destruyen el contenido de `TEST_DATABASE_URL`. Debe ser una base exclusiva cuyo nombre indique claramente que es de pruebas; nunca uses la base local normal ni producción.

`npm run test:browser` añade una comprobación Chromium en tamaño Pixel 5. Requiere `TEST_DATABASE_URL` apuntando a una base desechable y el navegador instalado con `npx playwright install chromium`. El comando fuerza `NODE_ENV=test` y `DATABASE_URL` a esa conexión antes de migrar o cargar datos; además rechaza nombres de base que no incluyan `test` o `e2e`.

El workflow `.github/workflows/ci.yml` reproduce Prisma, lint, unitarias, build, e2e de API y navegador en cada cambio de `main` y cada pull request.

## Configuración y secretos de producción

Usa `.env.production.example` solamente como inventario. Los valores reales deben inyectarse desde el gestor de secretos del proveedor o desde archivos protegidos fuera del repositorio.

Variables obligatorias o relevantes:

- `NODE_ENV=production`.
- `DATABASE_URL`: conexión PostgreSQL del usuario de aplicación con contraseña única y TLS cuando el proveedor lo permita.
- `WEB_ORIGIN`: origen público HTTPS exacto, sin ruta ni diagonal final.
- `API_PORT`: puerto interno de NestJS.
- `SESSION_TTL_DAYS`: entre 1 y 30.
- `TZ=America/Mazatlan`.

La aplicación valida estos valores antes de escuchar conexiones. No pongas contraseñas en Git, imágenes, argumentos de procesos, archivos del frontend ni registros. Restringe lectura de secretos al usuario que ejecuta la API y rota la contraseña si se expone.

## Compilación y despliegue

1. Obtén una versión concreta del repositorio y ejecuta:

   ```bash
   npm ci
   npm run prisma:generate
   npm run verify
   npm run db:deploy
   ```

2. Los artefactos quedan en:

   - API: `apps/api/dist/`.
   - Web: `apps/web/dist/web/browser/`.

3. Inicia NestJS con las variables de producción ya inyectadas:

   ```bash
   npm run start:api:prod
   ```

4. Sirve `apps/web/dist/web/browser/` como archivos estáticos. El servidor web debe devolver `index.html` para rutas de Angular que no correspondan a archivos y enviar `/api/*` al proceso NestJS.
5. Publica web y API bajo el mismo sitio HTTPS. Esto permite cookies `__Host-`, `Secure`, `HttpOnly` y `SameSite=Lax`, y mantiene la comprobación exacta de origen usada contra CSRF.

Angular recomienda construir con `ng build` y servir el directorio generado; NestJS recomienda compilar y ejecutar los artefactos de producción. Consulta la [guía oficial de despliegue de Angular](https://angular.dev/tools/cli/deployment) y la [guía oficial de NestJS](https://docs.nestjs.com/deployment).

## Migraciones

- En desarrollo, crea y revisa migraciones mediante `npm run db:migrate`.
- Confirma en Git `schema.prisma` y cada directorio completo de `apps/api/prisma/migrations/`.
- Antes de producción, crea un respaldo y ejecuta `npm run db:status`.
- En producción utiliza exclusivamente `npm run db:deploy`. No uses `prisma migrate dev`, `db push` ni `migrate reset`.
- Ejecuta una sola migración de despliegue por base. Si falla, detén la publicación, conserva el error y los datos, y corrige mediante una migración revisada; no borres la base.

En Prisma ORM 7, `migrate deploy` aplica migraciones pendientes sin usar una base sombra ni reiniciar datos, tal como describe la [referencia oficial](https://www.prisma.io/docs/cli/v7/migrate/deploy).

## Copia completa de PostgreSQL

La exportación CSV de la interfaz no es un respaldo: omite actividades, tareas completadas, sesiones, proyectos y metadatos internos. El respaldo válido es el de toda la base PostgreSQL.

Configura `PGHOST`, `PGPORT`, `PGUSER` y `PGDATABASE`, y entrega la contraseña mediante el gestor de secretos o un archivo `.pgpass` con permisos `0600`. No uses la URL de Prisma con `?schema=public` directamente en `pg_dump`, porque ese parámetro no pertenece a libpq.

Ejemplo de copia en formato personalizado:

```bash
mkdir -p backups
PGDATABASE=trato pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file=backups/trato-AAAA-MM-DD.dump
pg_restore --list backups/trato-AAAA-MM-DD.dump > /dev/null
```

El repositorio incluye un envoltorio que crea archivos privados, verifica el catálogo y añade una suma SHA-256. `BACKUP_DIR` debe estar fuera del repositorio:

```bash
export PGHOST=localhost PGPORT=5432 PGUSER=trato PGDATABASE=trato
export BACKUP_DIR=/ruta/privada/respaldos-trato
npm run db:backup
```

El archivo contiene las tablas completas, incluidos proyectos, registros, actividades, historial, tareas pendientes y completadas. Cifra el respaldo, limita sus permisos, guárdalo fuera del servidor principal y define retención y pruebas periódicas de restauración. `pg_dump` produce una copia consistente sin bloquear lectores o escritores; PostgreSQL recomienda respaldos regulares y documenta sus formatos en [`pg_dump`](https://www.postgresql.org/docs/current/app-pgdump.html).

## Restauración comprobable

Restaura primero en una base vacía separada; nunca ensayes sobre producción:

```bash
createdb --owner=trato trato_restore_aaaammdd
PGDATABASE=trato_restore_aaaammdd pg_restore \
  --exit-on-error \
  --single-transaction \
  --no-owner \
  --no-privileges \
  backups/trato-AAAA-MM-DD.dump
```

Después:

1. Apunta temporalmente una instancia de la API a la base restaurada.
2. Ejecuta `npm run db:status` con esa conexión.
3. Comprueba `/api/health`.
4. Inicia sesión y verifica proyectos, una ficha con actividades y tareas pendientes/completadas.
5. Solo después de esa validación decide el cambio controlado de `DATABASE_URL` y conserva el respaldo anterior.

`pg_restore --exit-on-error --single-transaction` evita aceptar silenciosamente una restauración parcial. Consulta la [referencia oficial de `pg_restore`](https://www.postgresql.org/docs/current/app-pgrestore.html).

También puede ensayarse con una base temporal nueva; el script la elimina al terminar salvo que se establezca `KEEP_RESTORE_DB=1`. `PGADMINUSER` identifica el rol autorizado para crear y eliminar esa base; si se omite, usa el usuario del sistema. `PGUSER` continúa siendo el rol limitado que restaura y consulta:

```bash
npm run db:restore:check -- /ruta/privada/trato.dump trato_restore_aaaammdd
```

## Comprobaciones de salud

- `GET /api/health` debe responder `200`, `status: "ok"` y `database: "up"`.
- Comprueba también que la web entregue `index.html`, que `/api/auth/session` responda y que una cuenta real pueda iniciar y cerrar sesión.
- Tras una migración, abre Hoy, cartera, una ficha y Seguimientos dentro de un proyecto conocido.
- Monitoriza disponibilidad, errores HTTP 5xx, espacio de PostgreSQL y antigüedad del último respaldo. El endpoint de salud no reemplaza estas alertas.

## Limitaciones conocidas

- Existe un solo usuario propietario; no hay roles, equipos ni uso compartido.
- No hay registro público, recuperación de contraseña por correo ni cambio de contraseña desde la interfaz. La credencial inicial se administra por terminal.
- No hay modo sin conexión, notificaciones push, automatizaciones ni envío automático de mensajes.
- WhatsApp y Maps son enlaces; no confirman contacto, geocodifican ni validan la ubicación.
- No hay archivos adjuntos, importación masiva ni borrado definitivo en la interfaz.
- El CSV es una vista tabular de la cartera, no contiene todo el historial y no sustituye `pg_dump`.
- Los respaldos, rotación, monitoreo, TLS y alta disponibilidad dependen del entorno de operación; la aplicación no los automatiza.
- La recuperación a un punto exacto en el tiempo requiere archivado WAL/PITR del proveedor y no forma parte de esta instalación inicial.

Antes de publicar o actualizar, sigue la lista verificable de `docs/despliegue.md`.
