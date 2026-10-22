# Lista de despliegue y actualización

Esta lista no elige proveedor, dominio ni estrategia de respaldo. Se aplica cuando esos datos ya están definidos y evita publicar una versión sin verificación o capacidad de recuperación.

## Antes de publicar

- [ ] Trabajar desde un commit concreto y con el repositorio limpio.
- [ ] Confirmar que `NODE_ENV=production`, `TZ=America/Mazatlan` y `WEB_ORIGIN` contiene el origen HTTPS exacto.
- [ ] Inyectar `DATABASE_URL` desde el gestor de secretos; no copiar `.env` al artefacto web.
- [ ] Ejecutar `npm ci`, `npm run prisma:generate` y `npm run verify`.
- [ ] Confirmar que la CI del commit terminó correctamente.
- [ ] Ejecutar `npm run db:status` y revisar las migraciones pendientes.
- [ ] Crear `npm run db:backup` en una ubicación externa y conservar su archivo `.sha256`.
- [ ] Ensayar el respaldo reciente con `npm run db:restore:check`.
- [ ] Registrar versión, responsable, hora prevista y punto de reversión.

## Publicación

- [ ] Detener tareas administrativas que pudieran competir con migraciones.
- [ ] Ejecutar una sola vez `npm run db:deploy` con la conexión de producción.
- [ ] Compilar con `npm run build` o publicar exactamente los artefactos ya verificados.
- [ ] Servir `apps/web/dist/web/browser/` con fallback a `index.html`.
- [ ] Iniciar `apps/api/dist/main.js` mediante un supervisor de procesos.
- [ ] Enviar `/api/*` al backend y mantener web y API bajo el mismo sitio HTTPS.
- [ ] No ejecutar `db:seed`, `migrate dev`, `db push` ni `migrate reset`.

## Comprobación posterior

- [ ] Verificar `GET /api/health`: HTTP 200, `status: ok` y `database: up`.
- [ ] Iniciar y cerrar sesión con la cuenta administrativa real.
- [ ] Abrir Hoy, cartera, una ficha y Seguimientos dentro de un proyecto conocido.
- [ ] Crear un registro temporal de comprobación únicamente si existe un procedimiento acordado para archivarlo.
- [ ] Descargar un CSV y confirmar que pertenece al proyecto activo.
- [ ] Revisar errores HTTP 5xx y registros del proceso durante los primeros minutos.
- [ ] Confirmar que la siguiente copia programada sigue activa.

## Reversión

- [ ] Si la aplicación falla pero la migración fue compatible, volver al artefacto anterior y conservar la base.
- [ ] No editar ni borrar manualmente una migración ya aplicada.
- [ ] Si los datos quedaron comprometidos, detener escrituras antes de restaurar.
- [ ] Restaurar primero en una base separada y verificarla; no sobrescribir producción como primer intento.
- [ ] Registrar el incidente, el commit, la migración y la decisión tomada.
