# Secuencia de avance

## Estado

- [x] Etapa 1 — Base técnica
- [x] Etapa 2 — Modelo de datos y reglas comerciales
- [x] Etapa 3 — Acceso privado
- [x] Etapa 4 — Proyectos comerciales
- [x] Etapa 5 — Clientes y prospectos
- [x] Etapa 6 — Seguimiento comercial
- [x] Etapa 7 — Pendientes y semáforo
- [x] Etapa 8 — Enlaces y pulido móvil
- [x] Etapa 9 — Uso diario desde el celular
- [x] Etapa 10 — Validación y preparación para uso real

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

Flujo completo para crear, consultar y editar registros dentro del proyecto activo. Incluye alta mínima con solo el nombre, búsqueda por negocio, encargado o teléfono, filtros por etapa e interés, paginación en el backend, tabla de escritorio y tarjetas móviles.

La ficha edita datos generales, etapa, interés y notas, y consulta historial y seguimientos existentes. Cambiar la etapa a `CLIENTE` conserva la misma ficha y relaciones. Los registros archivados quedan fuera del listado habitual, son de solo lectura y pueden restaurarse; no hay borrado definitivo. Verificado con 12 pruebas e2e sobre PostgreSQL limpio, incluidas paginación, filtros, conversión, preservación de historial, archivo y restauración.

## Etapa 6 — Seguimiento comercial

Actividades de llamada, WhatsApp, visita, demo y nota con fecha, resumen y resultado opcional. La ficha permite registrar el contacto y definir en el mismo flujo una próxima acción, además de crear, editar, reprogramar y completar tareas con otra tarea opcional.

Los cambios de etapa, reprogramaciones y finalizaciones quedan como notas del historial. Los vencimientos continúan como fechas de calendario y el atajo “En un mes” ajusta al último día válido. Los prospectos activos sin pendiente muestran una advertencia que no se aplica por defecto a clientes.

Las operaciones compuestas son transaccionales e idempotentes mediante UUID de solicitud persistido, por lo que un formulario reenviado no duplica actividades ni tareas. Verificado aplicando las tres migraciones desde cero y con 13 pruebas e2e sobre PostgreSQL limpio, incluidas duplicación, orden inverso, aislamiento, cambio de etapa, reprogramación, finalización y siguiente tarea.

## Etapa 7 — Pendientes y semáforo

Semáforo calculado exclusivamente en el backend desde la tarea pendiente más cercana y el día de calendario de `America/Mazatlan`: rojo para vencidas, amarillo para hoy o los tres días siguientes, verde para fechas posteriores y gris sin tarea aplicable. El mismo estado se presenta con icono, texto y color en cartera, ficha y Hoy.

La pantalla Hoy muestra únicamente tareas y métricas del proyecto seleccionado: vencidas, de hoy, de los próximos tres días, prospectos activos sin acción, prospectos activos, interés alto, clientes y total vencido. Permite abrir la ficha, completar y reprogramar usando los endpoints idempotentes existentes. Completadas, descartados y archivados quedan fuera; los clientes con pendientes sí participan.

No se necesitó otra migración. Verificado aplicando las tres migraciones existentes desde cero y con 14 pruebas e2e sobre PostgreSQL limpio, además de pruebas unitarias para el cambio de día en Mazatlán, el límite inclusivo de tres días y el cruce de año.

## Etapa 8 — Enlaces y pulido móvil

Accesos seguros a WhatsApp y Google Maps desde la cartera responsive y la ficha. WhatsApp exige E.164 con código de país y abre `wa.me` sin mensaje automático ni efecto en el historial. Maps prefiere coordenadas manuales válidas y usa como alternativa la dirección completa correctamente codificada.

La ficha permite capturar latitud y longitud juntas y valida rangos en frontend, backend y PostgreSQL. Si falta toda ubicación se oculta la acción; si solo existe dirección se advierte que un dato incompleto puede ser impreciso. Los enlaces usan HTTPS fijo, pestaña nueva, texto accesible y protección `noopener noreferrer`.

No se agregó una migración ni se integraron APIs, geocodificación, claves o facturación. Verificado con pruebas unitarias de teléfonos internacionales, direcciones con acentos y caracteres especiales, coordenadas negativas y ausencia de ubicación; la suite e2e comprueba E.164, persistencia manual, rangos y pares de coordenadas.

## Etapa 9 — Uso diario desde el celular

Flujo directo “Registrar contacto” desde cada tarjeta activa de la cartera. La ficha abre y enfoca un formulario breve que permite registrar lo ocurrido, actualizar el interés y programar la siguiente acción en un único envío transaccional e idempotente. Los formularios mantienen la información tras errores recuperables, bloquean dobles envíos y advierten antes de abandonar cambios sin guardar.

La vista Seguimientos ya es funcional y se limita en backend al proyecto seleccionado. Filtra por pendientes, completados o todos y por rango de vencimientos, conserva los filtros ante errores y ofrece estados vacíos accionables. Archivados y descartados no aparecen en esta agenda operativa.

Se revisó el recorrido en navegador con un viewport móvil: navegación inferior, tarjetas, foco directo, etiquetas, texto del semáforo y controles táctiles. No se agregó modo sin conexión, notificaciones ni automatizaciones. Esta etapa no requiere migración. Verificado con lint, compilación estricta, 19 pruebas unitarias y 14 pruebas e2e sobre PostgreSQL limpio, incluidas autorización, aislamiento, rangos de fecha, tareas completadas y exclusiones.

## Etapa 10 — Validación y preparación para uso real

Revisión integral de acceso, aislamiento, cartera, conversión, historial, tareas, semáforo, exclusiones, enlaces y flujos móviles. Se agregó la exportación CSV de la cartera completa del proyecto activo, con etapa, interés y próxima acción. La descarga se autoriza en NestJS, no mezcla proyectos y neutraliza fórmulas en todas las celdas antes de aplicar el escapado CSV.

La configuración de producción ahora se valida al arrancar y cuenta con un ejemplo sin secretos. `docs/operacion.md` documenta PostgreSQL local o Docker, compilación, despliegue bajo un mismo origen HTTPS, migraciones, usuario inicial, copias completas, restauración en una base separada, salud y limitaciones conocidas. El CSV queda expresamente excluido como mecanismo de respaldo.

Esta etapa no requiere migración de esquema. Verificado el 22 de octubre de 2026 con esquema Prisma válido, lint sin advertencias, compilaciones de producción, 30 pruebas unitarias y 15 pruebas e2e sobre una base PostgreSQL aislada. La base local reportó sus tres migraciones al día y `/api/health` respondió `status: ok`, `database: up` y la zona `America/Mazatlan`.

También se ensayó una copia real en formato personalizado y su restauración transaccional en otra base vacía. Coincidieron los conteos de usuarios, proyectos, registros, actividades, tareas, operaciones idempotentes y migraciones. La revisión responsive a 390 × 844 confirmó inicio de sesión, proyecto visible, navegación inferior, tarjetas, registrar contacto, enlaces externos y el control de exportación con su advertencia. Las bases y archivos temporales del ensayo se eliminaron al terminar.

Endurecimiento posterior: CI con PostgreSQL 17, recorrido Chromium móvil, diagnóstico de preparación, scripts seguros de copia y restauración, permisos privados para `.env` y una lista de despliegue y reversión. El usuario ficticio sin contraseña puede adoptar el nombre y correo elegidos mediante el procedimiento administrativo sin romper la propiedad de sus proyectos.

Mejora de captura móvil: la ficha acepta coordenadas pegadas como `latitud, longitud` y las redondea a la precisión existente antes de conservarlas en columnas separadas. El teléfono se edita como código de país visible —con `+52` inicial— y número nacional legible, pero continúa persistiendo un único E.164 compatible con WhatsApp. No requiere migración y mantiene los registros existentes. Verificado con ocho pruebas unitarias nuevas y el recorrido Chromium móvil completo.

Orden de cartera: el backend pagina por fecha de creación ascendente de forma predeterminada, con el identificador como desempate estable, para mostrar primero el primer registro capturado. La interfaz permite invertir inmediatamente el orden y comenzar por los registros más recientes; búsqueda, filtros, activos y archivados conservan la misma regla.

Cada etapa deberá agregar sus migraciones, pruebas y notas de ejecución sin adelantar funciones de etapas posteriores.
