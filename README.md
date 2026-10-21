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

5. Inicia la API y el frontend en dos terminales:

   ```bash
   npm run dev:api
   npm run dev:web
   ```

La web queda disponible en <http://localhost:4200> y el endpoint de salud en <http://localhost:3000/api/health>.

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

La prueba integral del endpoint requiere que PostgreSQL esté activo:

```bash
curl http://localhost:3000/api/health
```

Los vencimientos de seguimiento son fechas de calendario (`YYYY-MM-DD`) sin hora. Las actividades del historial sí usan marcas de tiempo. La próxima acción se obtiene ordenando las tareas pendientes por la fecha de vencimiento más cercana; no existe una agenda global.

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
