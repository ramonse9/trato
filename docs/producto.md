# Decisiones de producto

## Propósito

Trato será una aplicación web privada para registrar y dar seguimiento a clientes y prospectos de distintos proyectos comerciales. Debe responder rápidamente qué ocurrió con cada prospecto y cuál es el siguiente paso, especialmente desde un teléfono después de una visita.

## Usuario y alcance

- En el inicio existe un único usuario propietario.
- No hay registro público.
- Cada proyecto comercial tiene una cartera completamente separada.
- Clientes, prospectos, contactos, visitas y seguimientos pertenecen a un solo proyecto.
- El backend aplicará el aislamiento por proyecto en todas las consultas y mutaciones; el frontend nunca será la barrera de seguridad.
- La interfaz y los mensajes para el usuario estarán en español.
- La zona horaria inicial es `America/Mazatlan`; las fechas se persistirán en UTC y se presentarán en esa zona.

## Funciones previstas

- Inicio de sesión privado.
- Administración de proyectos comerciales.
- Clientes y prospectos por proyecto.
- Etapa comercial, nivel de interés y próxima acción.
- Historial de contactos y visitas.
- Semáforo de seguimiento.
- Pendientes del proyecto seleccionado.
- Enlaces a WhatsApp y Google Maps.

## Fuera de alcance

- Registro público.
- Cobros.
- Envío automático de mensajes.
- Inteligencia artificial.
- Servicios externos de pago.
- Microservicios o infraestructura anticipada sin una necesidad comprobada.

## Arquitectura y tecnología

- Un repositorio npm con `apps/api` y `apps/web`.
- API REST modular con NestJS 12.
- Interfaz responsive con Angular 22 y Angular Material 22.
- PostgreSQL 18 para persistencia y Prisma ORM 7 para acceso tipado.
- Node.js 24 LTS y TypeScript 6 en modo estricto.
- PostgreSQL local mediante Docker Compose.
- La API expone sus rutas bajo `/api` y permite en desarrollo el origen configurado en `WEB_ORIGIN`.

Las versiones se eligieron el 21 de octubre de 2026 consultando la documentación oficial: Angular 22 está en soporte activo y requiere Node.js 22.22.3, 24.15 o 26; NestJS 12 exige esas versiones para sus generadores; Prisma 7 es la línea estable recomendada para producción y PostgreSQL 18 es la versión actual soportada.

## Modelo comercial

- `Usuario` es propietario de sus proyectos comerciales.
- `ProyectoComercial` es la frontera de aislamiento de la cartera.
- `RegistroComercial` representa al prospecto o cliente dentro de un único proyecto. La etapa `CLIENTE` identifica la conversión sin mantener un tipo redundante.
- `Actividad` conserva eventos históricos de llamada, WhatsApp, visita, demo o nota.
- `TareaSeguimiento` conserva próximas acciones pendientes o completadas.
- Actividades y tareas incluyen `proyectoId` y usan una llave foránea compuesta con el registro. PostgreSQL rechaza cualquier relación que cruce proyectos.
- No existe agenda global ni una relación para compartir registros entre proyectos.

La próxima acción no se almacena como un campo duplicado: se obtiene buscando la tarea `PENDIENTE` con `fechaVencimiento` más cercana dentro del proyecto y registro. “Esperando respuesta” y “Visitar en un mes” son descripciones de tareas con fecha, nunca niveles de interés.

Los vencimientos usan el tipo PostgreSQL `DATE` y se intercambiarán como valores `YYYY-MM-DD`. Las actividades, auditoría y fechas de completado usan `TIMESTAMPTZ`; se guardan en UTC y se presentan en `America/Mazatlan`.

El teléfono, cuando existe, debe usar formato E.164 con código de país. Las coordenadas se guardan juntas y PostgreSQL valida sus rangos. Una tarea completada debe tener `completadaEn` y una pendiente no puede tenerla.

El seed usa información ficticia, no incluye contraseñas ni tokens, y se detiene explícitamente cuando `NODE_ENV=production`.

## Principios de entrega

- Cada etapa debe terminar con una parte funcional y verificable.
- No se inicia una etapa posterior de forma automática.
- Antes de cada nueva etapa se revisan este documento, `docs/avance.md` y el código existente.
- Se prioriza una experiencia móvil clara, controles táctiles cómodos y accesibilidad básica.
