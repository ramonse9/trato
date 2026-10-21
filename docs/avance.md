# Secuencia de avance

## Estado

- [x] Etapa 1 — Base técnica
- [x] Etapa 2 — Modelo de datos y reglas comerciales
- [x] Etapa 3 — Acceso privado
- [x] Etapa 4 — Proyectos comerciales
- [ ] Etapa 5 — Clientes y prospectos
- [ ] Etapa 6 — Seguimiento comercial
- [ ] Etapa 7 — Pendientes y semáforo
- [ ] Etapa 8 — Enlaces y pulido móvil

## Etapa 1 — Base técnica

Monorepo con NestJS y Angular, TypeScript estricto, Angular Material, Prisma, conexión a PostgreSQL, Docker Compose, endpoint `GET /api/health`, pantalla inicial y documentación local.

Verificado: Prisma valida su esquema, las pruebas y compilaciones pasan, PostgreSQL reporta salud y el endpoint confirma la conexión.

## Etapa 2 — Modelo de datos y reglas comerciales

Modelos Prisma para usuario, proyecto, registro comercial, actividad y tarea de seguimiento. Incluye enums comerciales, migración SQL, restricciones de integridad, aislamiento por proyecto mediante llaves foráneas compuestas y seed ficticio exclusivo de desarrollo con dos carteras separadas.

Verificado en una base PostgreSQL limpia: la migración y el seed se aplican correctamente; cada proyecto conserva su propia cartera; la próxima acción se obtiene por fecha; y PostgreSQL rechaza cruces entre proyectos, teléfonos o coordenadas inválidos y estados de tarea inconsistentes. El seed también rechaza su ejecución en producción.

## Etapa 3 — Acceso privado

Inicio y cierre de sesión para un usuario creado de forma administrativa, sin registro público. Incluye hash `scrypt`, sesiones opacas persistidas, cookie `HttpOnly` segura en producción, protección CSRF por origen y token, límites de intentos, validación global, errores seguros, guard de Angular y autorización efectiva en NestJS.

Las rutas de proyectos, registros, actividades y tareas validan la cadena completa de pertenencia al usuario autenticado. Verificado con ocho pruebas e2e sobre una base PostgreSQL limpia: acceso anónimo denegado, cookie de sesión, proyecto de otro usuario invisible, consulta y modificación cruzadas rechazadas, actividades y tareas sin mezcla, CSRF obligatorio, límite de intentos y cierre de sesión efectivo.

## Etapa 4 — Proyectos comerciales

Administración para crear, listar y editar proyectos, además de archivarlos y restaurarlos sin perder datos. El proyecto activo se conserva por usuario en el navegador, se valida contra el backend y aparece en la barra global y en la URL. La navegación responsive incluye Hoy, Prospectos y clientes, Seguimientos y Configuración.

El cambio de proyecto reinicia formularios y aumenta una revisión de contexto para descartar respuestas tardías. Los archivados quedan fuera del selector y todas sus mutaciones se bloquean en NestJS hasta restaurarlos. Verificado con 11 pruebas e2e sobre PostgreSQL limpio y pruebas Angular específicas de selección persistida y respuestas de red obsoletas.

## Etapa 5 — Clientes y prospectos

CRUD de registros dentro del proyecto seleccionado, conversión de prospecto a cliente y búsqueda básica. Diseño responsive orientado a uso móvil.

## Etapa 6 — Seguimiento comercial

Etapas, interés, próxima acción e historial cronológico de contactos y visitas. Formularios rápidos después de una visita.

## Etapa 7 — Pendientes y semáforo

Vista de pendientes del proyecto seleccionado y reglas explícitas para estados verde, amarillo y rojo, calculadas en el backend.

## Etapa 8 — Enlaces y pulido móvil

Enlaces seguros a WhatsApp y Google Maps, revisión de accesibilidad, estados vacíos, manejo de errores y recorrido completo desde móvil.

Cada etapa deberá agregar sus migraciones, pruebas y notas de ejecución sin adelantar funciones de etapas posteriores.
