# Trato

Base de una aplicación web privada para administrar clientes y prospectos por proyecto comercial.

## Requisitos

- Node.js 24 LTS (24.15 o posterior)
- npm 11
- PostgreSQL 17 o 18
- Docker con Docker Compose es opcional

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

3. Inicia PostgreSQL con Docker:

   ```bash
   npm run db:up
   ```

   Si ya tienes PostgreSQL local, crea una base y un rol exclusivos en vez de ejecutar Docker:

   ```bash
   createuser --login --pwprompt trato
   createdb --owner=trato trato
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

También puedes ejecutar toda la verificación con `npm run verify`.

Las pruebas de autorización usan una base exclusiva y ya migrada, nunca una base con datos reales:

```bash
createdb trato_e2e
DATABASE_URL=postgresql://TU_USUARIO@localhost:5432/trato_e2e npm run db:deploy
TEST_DATABASE_URL=postgresql://TU_USUARIO@localhost:5432/trato_e2e npm run test:e2e --workspace @trato/api
dropdb trato_e2e
```

La suite e2e limpia por completo la base indicada en `TEST_DATABASE_URL` antes de preparar sus casos. Comprueba acceso anónimo, aislamiento entre usuarios y proyectos, registros cruzados, actividades, tareas, operaciones idempotentes, CSRF, limitación de intentos, cierre de sesión y los ciclos de proyectos y registros.

La prueba integral del endpoint requiere que PostgreSQL esté activo:

```bash
curl http://localhost:3000/api/health
```

Los vencimientos de seguimiento son fechas de calendario (`YYYY-MM-DD`) sin hora. Las actividades del historial sí usan marcas de tiempo. La próxima acción se obtiene ordenando las tareas pendientes por la fecha de vencimiento más cercana; no existe una agenda global.

## Navegación por proyecto

Después de iniciar sesión, Trato valida el último proyecto seleccionado y abre `/p/:projectId/today`. La barra superior permite cambiar de proyecto y mantiene visible el contexto activo; en teléfono, la navegación principal aparece en la parte inferior. Los proyectos archivados se administran desde **Administrar proyectos**, no aparecen en el selector y permanecen en modo de solo lectura hasta restaurarlos.

El identificador recordado en el navegador no concede acceso: cada ruta y operación vuelve a comprobar en NestJS que el proyecto pertenezca al usuario autenticado.

## Prospectos y clientes

Entra en **Prospectos y clientes** para buscar y filtrar la cartera del proyecto activo. El listado muestra 20 registros por página e incluye el último contacto y la próxima tarea pendiente. En pantallas pequeñas cambia automáticamente a tarjetas.

**Nuevo prospecto** pide solamente el nombre del negocio. Desde la ficha se completan encargado, teléfono internacional, correo, dirección, etapa, interés y notas. Elegir la etapa **Cliente** conserva el mismo registro y todo su historial.

Los registros archivados se encuentran en la vista **Archivados** del mismo listado. Pueden consultarse y restaurarse, pero no editarse mientras continúen archivados. No hay una acción de borrado definitivo.

## Historial y seguimientos

Desde la ficha usa **Registrar contacto** para guardar una llamada, WhatsApp, visita, demo o nota con su fecha, resumen y resultado. El mismo formulario permite dejar la próxima acción. **Nueva tarea** crea un seguimiento sin tener que registrar antes un contacto.

Las tareas pendientes se pueden editar, reprogramar o completar. Al completarlas, el resultado es opcional y también puedes programar otra acción. Los atajos disponibles son mañana, en una semana y en un mes; el campo de fecha permite elegir cualquier otra fecha.

Las reprogramaciones, finalizaciones y cambios de etapa aparecen como notas automáticas del historial. Los formularios bloquean el doble toque y la API usa identificadores idempotentes para que un reenvío de red tampoco cree duplicados.

## Hoy y semáforo

La sección **Hoy** resume exclusivamente el proyecto activo. Presenta indicadores, tareas vencidas, tareas de hoy, tareas de los próximos tres días y prospectos activos sin próxima acción. Desde cada pendiente puedes abrir la ficha, completar la tarea o cambiar su fecha.

El semáforo usa la tarea pendiente más próxima y la fecha de `America/Mazatlan`:

- **Vencido (!):** fecha anterior a hoy.
- **Próximo (◷):** hoy o cualquiera de los siguientes tres días de calendario.
- **Al día (✓):** después de ese período.
- **Sin pendientes (—):** no existe una tarea pendiente aplicable.

Las tareas completadas no cuentan. Los descartados y archivados quedan fuera de los pendientes habituales; los clientes con tareas sí aparecen.

## WhatsApp y Google Maps

El listado y la ficha muestran **Abrir WhatsApp** cuando existe un teléfono E.164 válido, por ejemplo `+351211234567`. El código de país es obligatorio. El enlace abre la conversación, pero no incluye un mensaje ni registra por sí mismo un contacto realizado.

**Abrir ubicación** usa las coordenadas manuales cuando existen; en caso contrario utiliza la dirección codificada. La latitud y longitud deben capturarse juntas y respetar los rangos geográficos. Sin dirección ni coordenadas la acción no aparece.

Estos accesos son enlaces HTTPS comunes. No necesitan claves, facturación, Maps JavaScript API, Places API, geocodificación ni autocompletado externo.

## Exportación CSV

La cartera permite descargar todos los registros del proyecto activo, incluidos los archivados, con etapa, interés y próxima acción. La API vuelve a validar que el proyecto pertenezca al usuario y neutraliza celdas que una hoja de cálculo pudiera interpretar como fórmulas.

El CSV no incluye todo el historial ni sustituye un respaldo PostgreSQL.

## Sesiones en producción

Sirve la web y la API bajo el mismo sitio HTTPS, configura `NODE_ENV=production` y establece `WEB_ORIGIN` con el origen público exacto (esquema, host y puerto). En producción la cookie lleva `Secure` y el prefijo `__Host-`. `SESSION_TTL_DAYS` controla su vigencia (7 días por defecto; máximo 30). Los tokens de sesión se almacenan con hash en PostgreSQL y cerrar sesión los revoca.

No ejecutes `db:seed` en producción. Después de desplegar migraciones, crea el usuario mediante `npm run user:create` directamente en una terminal segura del servidor.

La guía completa de compilación, secretos, migraciones, copias, restauración, salud y limitaciones está en [`docs/operacion.md`](docs/operacion.md).

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
