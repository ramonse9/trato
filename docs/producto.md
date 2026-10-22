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

## Acceso y seguridad

- No existe registro público. El usuario inicial se crea o actualiza desde una terminal interactiva mediante `npm run user:create`; la contraseña no se recibe por argumentos ni se guarda en archivos.
- Las contraseñas se derivan con `scrypt` (`N=2^17`, `r=8`, `p=1`), sal aleatoria y comparación de tiempo constante. La base nunca guarda la contraseña original.
- La autenticación usa sesiones opacas en PostgreSQL. El navegador recibe un token aleatorio en una cookie `HttpOnly`, `SameSite=Lax`, con `Secure` y prefijo `__Host-` en producción; la base conserva únicamente el SHA-256 de ese token.
- Las sesiones duran siete días de forma predeterminada, configurable entre 1 y 30 mediante `SESSION_TTL_DAYS`. Cerrar sesión elimina la sesión en la base y borra la cookie.
- Las mutaciones exigen el origen exacto configurado en `WEB_ORIGIN`. Una mutación autenticada exige además `X-CSRF-Token`, un valor aleatorio asociado a la sesión. `SameSite` es una defensa adicional, no la única protección CSRF.
- El inicio de sesión se limita a cinco intentos por combinación de correo normalizado e IP cada quince minutos. La API mantiene además un límite general de cien solicitudes por minuto.
- La validación elimina campos no declarados y los errores inesperados se convierten en mensajes genéricos. Los fallos de credenciales no revelan si el correo existe.
- Angular protege la navegación y restaura la sesión, pero la autorización efectiva siempre ocurre en NestJS.

Las rutas de cartera llevan contexto explícito: `/api/projects/:projectId/records/:recordId`. Para cada consulta o cambio, la API comprueba en una sola cadena de pertenencia el usuario, proyecto y registro; actividades y tareas comprueban también sus propios identificadores. Una combinación ajena o cruzada responde como recurso no encontrado. Las llaves foráneas compuestas mantienen además la misma regla dentro de PostgreSQL.

## Proyectos y navegación

- El área privada usa un contexto explícito de proyecto también en la URL: `/p/:projectId/...`. Sus secciones principales son Hoy, Prospectos y clientes, Seguimientos y Configuración del proyecto.
- El proyecto activo se muestra en la barra superior y solo los proyectos propios no archivados aparecen en el selector operativo.
- El último proyecto elegido se recuerda en `localStorage` con una clave separada por usuario. Al abrir la aplicación, el identificador se valida contra la lista activa entregada por la API; un proyecto ajeno, eliminado o archivado nunca se recupera como activo.
- Cambiar de proyecto incrementa una revisión de contexto. Los formularios se reinician al cambiar esa revisión y las operaciones asíncronas capturan proyecto y revisión antes de comenzar; una respuesta tardía se ignora si el contexto ya cambió.
- Crear, editar, archivar y restaurar siempre valida al propietario en NestJS. Archivar conserva los registros relacionados, retira el proyecto del selector y bloquea sus mutaciones en el backend hasta restaurarlo. Los proyectos archivados se muestran aparte y en modo de solo lectura.
- No existe una vista agregada de registros comerciales entre proyectos. Las secciones aún pendientes mantienen la frontera del proyecto desde su ruta y contexto.

## Prospectos y clientes

- Un `RegistroComercial` sigue siendo la única ficha durante todo el ciclo. La etapa `CLIENTE` hace que se presente como cliente; no se copia ni se crea una segunda entidad y se conservan actividades, tareas y notas.
- Crear un prospecto exige únicamente el nombre del negocio. Encargado, teléfono, correo, dirección, interés y notas se completan después si se conocen.
- El listado siempre exige un proyecto en la ruta y se pagina en el backend con 20 elementos por defecto y un máximo de 50. Permite buscar por negocio, encargado o teléfono, y filtrar por etapa e interés.
- Último contacto y próxima acción se calculan al consultar: el primero es la actividad más reciente y la segunda es la tarea pendiente con fecha más cercana. No se mantienen campos duplicados en el registro.
- La ficha permite editar datos generales, etapa, interés y notas. También presenta el historial y los seguimientos existentes en modo de consulta; su captura y edición corresponden a la etapa 6.
- Archivar un registro conserva toda su información y lo retira de la cartera habitual. Los archivados se consultan por separado, permanecen en modo de solo lectura y pueden restaurarse. No existe borrado definitivo en la interfaz ni en la API inicial.
- Las respuestas del listado y de la ficha se aplican únicamente si siguen coincidiendo proyecto, revisión de contexto e identificador de registro. Cambiar de proyecto cancela las lecturas en curso y limpia filtros, formulario y resultados visibles.

## Historial y próximas acciones

- Las actividades son eventos inmutables de llamada, WhatsApp, visita, demo o nota. Guardan fecha y hora, resumen y resultado opcional, y se muestran de la más reciente a la más antigua.
- Registrar un contacto puede crear su próxima tarea dentro de la misma transacción. Si cualquiera de las dos escrituras falla, no se conserva una operación parcial.
- Las tareas pendientes pueden crearse, editarse, reprogramarse y completarse. Una tarea completada conserva su fecha original o reprogramada, resultado y marca de tiempo; no vuelve al estado pendiente ni se edita después de completarse.
- Completar una tarea puede crear otra de manera opcional y atómica. Los clientes pueden mantener tareas, pero la advertencia “Sin próxima acción” se reserva para prospectos activos que no estén descartados.
- Los cambios de etapa, las reprogramaciones y las finalizaciones generan notas automáticas en el historial. Repetir el mismo cambio de etapa no crea una nota adicional.
- Los atajos calculan mañana y una semana como fechas de calendario. “En un mes” conserva el número de día y, si no existe, usa el último día del mes de destino.
- Cada formulario de historial o seguimiento envía un UUID de solicitud. La API lo registra en PostgreSQL dentro de la misma transacción que la operación; un reenvío con el mismo UUID devuelve los recursos ya creados sin duplicarlos.
- Las mutaciones de actividades y tareas reutilizan la cadena de autorización usuario–proyecto–registro y los identificadores anidados. Los registros y proyectos archivados permanecen en modo de solo lectura.

## Semáforo y pantalla Hoy

- El backend es la fuente única del semáforo. Usa exclusivamente la tarea `PENDIENTE` más próxima: rojo si venció antes de hoy, amarillo si vence hoy o en los tres días de calendario siguientes, verde si vence después y gris si no existe una pendiente aplicable.
- “Hoy” se calcula en `America/Mazatlan` y se expresa como `YYYY-MM-DD`. Los límites se comparan como fechas de calendario, sin convertir el vencimiento a la zona horaria del navegador.
- Una tarea completada no participa. Los registros archivados o en etapa `DESCARTADO` reciben estado gris y no aparecen en los pendientes habituales. Los clientes sí participan cuando tienen tareas pendientes.
- La API devuelve el estado calculado al listado y a la ficha. Angular lo presenta mediante un único componente con icono, texto y color; ninguna pantalla vuelve a calcular las reglas.
- La pantalla Hoy exige un proyecto activo y muestra todas sus tareas vencidas, de hoy y de los tres días siguientes. También muestra prospectos activos sin tareas pendientes e indicadores de prospectos activos, interés alto, clientes y tareas vencidas.
- Completar o reprogramar desde Hoy usa las mismas operaciones autorizadas, transaccionales e idempotentes de la ficha. Una respuesta tardía se ignora si el proyecto activo cambió.
- Esta etapa no requiere migración: el estado se deriva de tareas y registros existentes y no se persiste como un dato duplicado.

## WhatsApp y Google Maps

- El teléfono se captura en formato E.164 con `+`, código de país y número. Angular, NestJS y PostgreSQL lo validan; la aplicación no supone un país predeterminado ni completa códigos silenciosamente.
- El enlace de WhatsApp tiene exclusivamente la forma `https://wa.me/<dígitos>`. No incluye texto, no envía mensajes y abrirlo no crea una actividad ni modifica el último contacto.
- La dirección, latitud y longitud se capturan manualmente. Las coordenadas deben guardarse juntas, con latitud entre -90 y 90, longitud entre -180 y 180 y hasta seis decimales.
- Google Maps usa `https://www.google.com/maps/search/?api=1&query=`. Prefiere el par de coordenadas válido; si no existe, usa la dirección completa codificada. Sin ninguno de los dos datos no se muestra la acción.
- La ficha advierte que una dirección incompleta puede producir resultados imprecisos. La dirección guardada y la acción “Abrir ubicación” llevan al mismo enlace calculado.
- Los enlaces externos parten de prefijos HTTPS constantes, codifican los datos variables, abren en otra pestaña y usan `rel="noopener noreferrer"`.
- No se usa Maps JavaScript API, Places API, geocodificación, autocompletado, claves, facturación ni servicios externos de pago.

## Uso diario desde el celular

- La cartera móvil presenta cada registro como una tarjeta y mantiene visible la acción “Registrar contacto”. El acceso abre directamente el formulario, desplaza la ficha hasta él y coloca el foco en el resumen para evitar pasos intermedios.
- El alta de un contacto reúne tipo, fecha, resumen y nivel de interés como datos principales. En el mismo envío se puede guardar un resultado y crear la próxima acción; la actividad, el interés y la tarea se actualizan de manera transaccional e idempotente.
- Los formularios bloquean reenvíos mientras una solicitud está en curso. Ante un error recuperable conservan valores e identificador de solicitud para poder reintentar sin duplicar la operación.
- La ficha y el alta de prospectos advierten antes de navegar, recargar o cerrar la pestaña si existen cambios visibles sin guardar. Una cancelación explícita limpia únicamente el formulario que se decidió descartar.
- La vista Seguimientos pertenece siempre al proyecto seleccionado. Permite consultar pendientes, completados o todos y acotar por fechas de calendario; el backend vuelve a validar propietario y proyecto, y excluye registros archivados o descartados.
- Cambiar de proyecto cancela las lecturas en curso y reinicia filtros y resultados. Los errores mantienen filtros editados para facilitar el reintento y las listas vacías ofrecen una acción clara para limpiarlos.
- Controles principales y acciones en tarjetas tienen un área táctil mínima de 44 px. Los campos usan etiquetas visibles, el foco de teclado es perceptible y los estados no dependen solamente del color.
- Esta etapa no incorpora modo sin conexión, notificaciones push ni automatizaciones.

## Exportación y preparación operativa

- La cartera permite exportar un CSV de todos los registros del proyecto activo, incluidos los archivados, sin paginación. Contiene etapa, interés, próxima acción y su fecha, además de los datos de contacto principales.
- La API autentica la descarga y comprueba nuevamente que el proyecto pertenece al usuario. No existe una exportación global ni una forma de elegir el proyecto mediante datos no autorizados del cliente.
- Todas las celdas se delimitan y escapan como CSV. Los valores capaces de iniciar fórmulas (`=`, `+`, `-`, `@` y variantes) se fuerzan a texto antes de descargar.
- El CSV es una ayuda operativa y no un respaldo. No incluye todo el historial, tareas completadas, sesiones ni metadatos; la recuperación completa utiliza `pg_dump` y `pg_restore` sobre toda la base.
- Producción exige PostgreSQL 17 o 18, HTTPS, un origen web exacto y secretos inyectados mediante variables de entorno. La API valida la configuración crítica antes de iniciar.
- Las migraciones de producción usan exclusivamente los archivos versionados y `prisma migrate deploy`; el seed de desarrollo nunca se ejecuta en producción.
- La operación inicial requiere respaldos externos periódicos, pruebas de restauración, monitoreo de salud y espacio disponible. Estas tareas no se automatizan dentro de la aplicación.

## Principios de entrega

- Cada etapa debe terminar con una parte funcional y verificable.
- No se inicia una etapa posterior de forma automática.
- Antes de cada nueva etapa se revisan este documento, `docs/avance.md` y el código existente.
- Se prioriza una experiencia móvil clara, controles táctiles cómodos y accesibilidad básica.
