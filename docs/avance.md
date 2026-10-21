# Secuencia de avance

## Estado

- [x] Etapa 1 — Base técnica
- [ ] Etapa 2 — Acceso privado
- [ ] Etapa 3 — Proyectos comerciales
- [ ] Etapa 4 — Clientes y prospectos
- [ ] Etapa 5 — Seguimiento comercial
- [ ] Etapa 6 — Pendientes y semáforo
- [ ] Etapa 7 — Enlaces y pulido móvil

## Etapa 1 — Base técnica

Monorepo con NestJS y Angular, TypeScript estricto, Angular Material, Prisma, conexión a PostgreSQL, Docker Compose, endpoint `GET /api/health`, pantalla inicial y documentación local.

Criterios de verificación: Prisma valida su esquema, las pruebas y compilaciones pasan, PostgreSQL reporta salud y el endpoint confirma la conexión.

## Etapa 2 — Acceso privado

Inicio y cierre de sesión para un usuario creado de forma administrativa. Contraseñas con hash, sesión protegida y rutas privadas. Sin registro público.

## Etapa 3 — Proyectos comerciales

Crear, listar, editar, archivar y seleccionar proyectos. Establecer el contexto de proyecto en la API y pruebas que demuestren el aislamiento.

## Etapa 4 — Clientes y prospectos

CRUD de contactos dentro del proyecto seleccionado, conversión de prospecto a cliente y búsqueda básica. Diseño responsive orientado a uso móvil.

## Etapa 5 — Seguimiento comercial

Etapas, interés, próxima acción e historial cronológico de contactos y visitas. Formularios rápidos después de una visita.

## Etapa 6 — Pendientes y semáforo

Vista de pendientes del proyecto seleccionado y reglas explícitas para estados verde, amarillo y rojo, calculadas en el backend.

## Etapa 7 — Enlaces y pulido móvil

Enlaces seguros a WhatsApp y Google Maps, revisión de accesibilidad, estados vacíos, manejo de errores y recorrido completo desde móvil.

Cada etapa deberá agregar sus migraciones, pruebas y notas de ejecución sin adelantar funciones de etapas posteriores.
