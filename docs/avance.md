# Secuencia de avance

## Estado

- [x] Etapa 1 — Base técnica
- [x] Etapa 2 — Modelo de datos y reglas comerciales
- [ ] Etapa 3 — Acceso privado
- [ ] Etapa 4 — Proyectos comerciales
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

Inicio y cierre de sesión para un usuario creado de forma administrativa. Contraseñas con hash, sesión protegida y rutas privadas. Sin registro público.

## Etapa 4 — Proyectos comerciales

Crear, listar, editar, archivar y seleccionar proyectos. Establecer el contexto de proyecto en la API y pruebas que demuestren el aislamiento.

## Etapa 5 — Clientes y prospectos

CRUD de registros dentro del proyecto seleccionado, conversión de prospecto a cliente y búsqueda básica. Diseño responsive orientado a uso móvil.

## Etapa 6 — Seguimiento comercial

Etapas, interés, próxima acción e historial cronológico de contactos y visitas. Formularios rápidos después de una visita.

## Etapa 7 — Pendientes y semáforo

Vista de pendientes del proyecto seleccionado y reglas explícitas para estados verde, amarillo y rojo, calculadas en el backend.

## Etapa 8 — Enlaces y pulido móvil

Enlaces seguros a WhatsApp y Google Maps, revisión de accesibilidad, estados vacíos, manejo de errores y recorrido completo desde móvil.

Cada etapa deberá agregar sus migraciones, pruebas y notas de ejecución sin adelantar funciones de etapas posteriores.
