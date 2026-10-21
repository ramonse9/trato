import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { hashPassword } from '../src/auth/password.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { addCalendarDays } from '../src/records/follow-up-status.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase('Acceso privado y aislamiento (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let agent: ReturnType<typeof request.agent>;
  let csrfToken: string;
  let projectA: string;
  let projectB: string;
  let recordA: string;
  let recordB: string;
  let activityB: string;
  let taskB: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    process.env.NODE_ENV = 'test';
    process.env.WEB_ORIGIN = 'http://localhost:4200';

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.sesion.deleteMany();
    await prisma.operacionRegistro.deleteMany();
    await prisma.actividad.deleteMany();
    await prisma.tareaSeguimiento.deleteMany();
    await prisma.registroComercial.deleteMany();
    await prisma.proyectoComercial.deleteMany();
    await prisma.usuario.deleteMany();

    const userA = await prisma.usuario.create({
      data: {
        nombre: 'Usuario A',
        correo: 'usuario-a@prueba.local',
        passwordHash: await hashPassword('frase-segura-a-2026'),
      },
    });
    const userB = await prisma.usuario.create({
      data: {
        nombre: 'Usuario B',
        correo: 'usuario-b@prueba.local',
        passwordHash: await hashPassword('frase-segura-b-2026'),
      },
    });
    const [createdProjectA, createdProjectB] = await Promise.all([
      prisma.proyectoComercial.create({
        data: { nombre: 'Proyecto A', usuarioId: userA.id },
      }),
      prisma.proyectoComercial.create({
        data: { nombre: 'Proyecto B', usuarioId: userB.id },
      }),
    ]);
    projectA = createdProjectA.id;
    projectB = createdProjectB.id;

    const [createdRecordA, createdRecordB] = await Promise.all([
      prisma.registroComercial.create({
        data: {
          nombreNegocio: 'Negocio A',
          nombreEncargado: 'Ana Encargada',
          telefono: '+526691112233',
          etapa: 'CONTACTADO',
          nivelInteres: 'ALTO',
          proyectoId: projectA,
        },
      }),
      prisma.registroComercial.create({
        data: { nombreNegocio: 'Negocio B', proyectoId: projectB },
      }),
    ]);
    recordA = createdRecordA.id;
    recordB = createdRecordB.id;

    await Promise.all([
      prisma.actividad.create({
        data: {
          proyectoId: projectA,
          registroId: recordA,
          tipo: 'LLAMADA',
          detalle: 'Último contacto del proyecto A',
          ocurridaEn: new Date('2026-10-20T18:00:00.000Z'),
        },
      }),
      prisma.tareaSeguimiento.create({
        data: {
          proyectoId: projectA,
          registroId: recordA,
          tipo: 'VISITA',
          descripcion: 'Visitar Negocio A',
          fechaVencimiento: new Date('2026-10-28T00:00:00.000Z'),
        },
      }),
    ]);

    const [activity, task] = await Promise.all([
      prisma.actividad.create({
        data: {
          proyectoId: projectB,
          registroId: recordB,
          tipo: 'VISITA',
          detalle: 'Actividad del proyecto B',
        },
      }),
      prisma.tareaSeguimiento.create({
        data: {
          proyectoId: projectB,
          registroId: recordB,
          tipo: 'LLAMADA',
          descripcion: 'Tarea del proyecto B',
          fechaVencimiento: new Date('2026-10-25T00:00:00.000Z'),
        },
      }),
    ]);
    activityB = activity.id;
    taskB = task.id;
  });

  it('mantiene salud pública pero rechaza datos sin sesión', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200);
    await request(app.getHttpServer())
      .get(`/api/projects/${projectA}/records`)
      .expect(401);
  });

  it('inicia sesión con cookie HttpOnly y crea el contexto autenticado', async () => {
    agent = request.agent(app.getHttpServer());
    const response = await agent
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:4200')
      .send({
        correo: 'usuario-a@prueba.local',
        password: 'frase-segura-a-2026',
      })
      .expect(201);

    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');
    expect(response.headers['set-cookie']?.[0]).toContain('SameSite=Lax');
    expect(response.body.user.correo).toBe('usuario-a@prueba.local');
    csrfToken = response.body.csrfToken;

    await agent.get(`/api/projects/${projectA}/records`).expect(200);
  });

  it('no permite acceder a proyectos de otro usuario', async () => {
    await agent.get(`/api/projects/${projectB}/records`).expect(404);
    await agent.get(`/api/projects/${projectB}/today`).expect(404);
  });

  it('crea, lista y edita únicamente proyectos propios', async () => {
    const created = await agent
      .post('/api/projects')
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({
        nombre: '  Proyecto nuevo  ',
        descripcion: '  Cartera independiente  ',
      })
      .expect(201);

    expect(created.body.nombre).toBe('Proyecto nuevo');
    expect(created.body.descripcion).toBe('Cartera independiente');

    await agent
      .patch(`/api/projects/${created.body.id}`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({ nombre: 'Proyecto nuevo editado', descripcion: '' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.nombre).toBe('Proyecto nuevo editado');
        expect(body.descripcion).toBeNull();
      });

    const active = await agent.get('/api/projects').expect(200);
    expect(active.body.map((project: { id: string }) => project.id)).toContain(
      created.body.id,
    );
  });

  it('no permite editar, archivar ni restaurar proyectos ajenos', async () => {
    await agent
      .patch(`/api/projects/${projectB}`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({ nombre: 'Proyecto invadido', descripcion: null })
      .expect(404);
    await agent
      .post(`/api/projects/${projectB}/archive`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({})
      .expect(404);
    await agent
      .post(`/api/projects/${projectB}/restore`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({})
      .expect(404);
  });

  it('no consulta ni modifica un registro bajo otro proyecto', async () => {
    await agent.get(`/api/projects/${projectA}/records/${recordB}`).expect(404);
    await agent
      .patch(`/api/projects/${projectA}/records/${recordB}`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({ nombreNegocio: 'Intento cruzado' })
      .expect(404);
    await agent
      .post(`/api/projects/${projectA}/records/${recordB}/archive`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({})
      .expect(404);

    const unchanged = await prisma.registroComercial.findUniqueOrThrow({
      where: { id: recordB },
    });
    expect(unchanged.nombreNegocio).toBe('Negocio B');
  });

  it('crea, edita, filtra, pagina, archiva y restaura registros', async () => {
    await agent
      .post(`/api/projects/${projectA}/records`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({ nombreNegocio: '   ' })
      .expect(400);

    const initialList = await agent
      .get(`/api/projects/${projectA}/records?page=1&pageSize=1`)
      .expect(200);
    expect(initialList.body.page).toBe(1);
    expect(initialList.body.pageSize).toBe(1);
    expect(initialList.body.total).toBeGreaterThanOrEqual(1);
    expect(initialList.body.items).toHaveLength(1);

    const filtered = await agent
      .get(
        `/api/projects/${projectA}/records?search=ana&etapa=CONTACTADO&nivelInteres=ALTO`,
      )
      .expect(200);
    expect(filtered.body.items).toHaveLength(1);
    expect(filtered.body.items[0].id).toBe(recordA);
    expect(filtered.body.items[0].ultimoContacto.tipo).toBe('LLAMADA');
    expect(filtered.body.items[0].proximaAccion.descripcion).toBe(
      'Visitar Negocio A',
    );
    expect(filtered.body.items[0].proximaAccion.fechaVencimiento).toBe(
      '2026-10-28',
    );

    await agent
      .patch(`/api/projects/${projectA}/records/${recordA}`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({ etapa: 'CLIENTE' })
      .expect(200);
    const converted = await agent
      .get(`/api/projects/${projectA}/records/${recordA}`)
      .expect(200);
    expect(converted.body.id).toBe(recordA);
    expect(converted.body.etapa).toBe('CLIENTE');
    expect(converted.body.actividades).toHaveLength(2);
    expect(converted.body.actividades[0].detalle).toBe(
      'Cambio de etapa comercial',
    );
    expect(converted.body.tareasSeguimiento).toHaveLength(1);

    const created = await agent
      .post(`/api/projects/${projectA}/records`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({ nombreNegocio: '  Prospecto mínimo  ' })
      .expect(201);
    expect(created.body.nombreNegocio).toBe('Prospecto mínimo');
    expect(created.body.etapa).toBe('POR_CONTACTAR');
    expect(created.body.nivelInteres).toBe('SIN_EVALUAR');

    const updated = await agent
      .patch(`/api/projects/${projectA}/records/${created.body.id}`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({
        nombreEncargado: 'María Cliente',
        telefono: '+526699998877',
        etapa: 'CLIENTE',
        nivelInteres: 'ALTO',
        notasGenerales: 'Conserva la misma ficha.',
      })
      .expect(200);
    expect(updated.body.id).toBe(created.body.id);
    expect(updated.body.etapa).toBe('CLIENTE');

    const clientSearch = await agent
      .get(
        `/api/projects/${projectA}/records?search=%2B526699998877&etapa=CLIENTE`,
      )
      .expect(200);
    expect(
      clientSearch.body.items.map((item: { id: string }) => item.id),
    ).toEqual([created.body.id]);

    await agent
      .post(`/api/projects/${projectA}/records/${created.body.id}/archive`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({})
      .expect(201);

    const regularList = await agent
      .get(`/api/projects/${projectA}/records?search=Prospecto%20mínimo`)
      .expect(200);
    expect(regularList.body.total).toBe(0);
    const archivedList = await agent
      .get(
        `/api/projects/${projectA}/records?archived=true&search=Prospecto%20mínimo`,
      )
      .expect(200);
    expect(archivedList.body.items[0].id).toBe(created.body.id);

    await agent
      .patch(`/api/projects/${projectA}/records/${created.body.id}`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({ nombreNegocio: 'No debe cambiar' })
      .expect(409);

    await agent
      .post(`/api/projects/${projectA}/records/${created.body.id}/restore`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({})
      .expect(201);

    const restored = await agent
      .get(`/api/projects/${projectA}/records/${created.body.id}`)
      .expect(200);
    expect(restored.body.archivadoEn).toBeNull();
    expect(restored.body.nombreNegocio).toBe('Prospecto mínimo');
    expect(restored.body.etapa).toBe('CLIENTE');
    expect(restored.body.notasGenerales).toBe('Conserva la misma ficha.');

    await agent
      .patch(`/api/projects/${projectA}/records/${created.body.id}`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({
        telefono: '+351211234567',
        direccion: 'Av. Ejército Mexicano #123, Centro, Mazatlán',
        latitud: 23.24861,
        longitud: -106.45531,
      })
      .expect(200);
    const withManualLocation = await agent
      .get(`/api/projects/${projectA}/records/${created.body.id}`)
      .expect(200);
    expect(withManualLocation.body.telefono).toBe('+351211234567');
    expect(withManualLocation.body.direccion).toContain('Ejército Mexicano');
    expect(withManualLocation.body.latitud).toBe('23.24861');
    expect(withManualLocation.body.longitud).toBe('-106.45531');

    await agent
      .patch(`/api/projects/${projectA}/records/${created.body.id}`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({ telefono: '6691234567' })
      .expect(400);
    await agent
      .patch(`/api/projects/${projectA}/records/${created.body.id}`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({ latitud: 91, longitud: -106.45531 })
      .expect(400);
    await agent
      .patch(`/api/projects/${projectA}/records/${created.body.id}`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({ latitud: null })
      .expect(400);
  });

  it('registra contactos y tareas sin duplicarlos y conserva los cambios relevantes', async () => {
    const created = await agent
      .post(`/api/projects/${projectA}/records`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({ nombreNegocio: 'Prospecto con seguimiento' })
      .expect(201);
    const recordId = created.body.id as string;
    const activityRequest = '61000000-0000-4000-8000-000000000001';
    const activityPayload = {
      solicitudId: activityRequest,
      tipo: 'VISITA',
      ocurridaEn: '2026-10-21T19:30:00.000Z',
      resumen: 'Se presentó el producto.',
      resultado: 'Solicitó una propuesta.',
      proximaAccion: {
        descripcion: 'Enviar propuesta',
        tipo: 'ENVIAR_PROPUESTA',
        fechaVencimiento: '2026-10-31',
      },
    };

    const firstActivity = await agent
      .post(`/api/projects/${projectA}/records/${recordId}/activities`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send(activityPayload)
      .expect(201);
    const repeatedActivity = await agent
      .post(`/api/projects/${projectA}/records/${recordId}/activities`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send(activityPayload)
      .expect(201);
    expect(repeatedActivity.body.actividad.id).toBe(
      firstActivity.body.actividad.id,
    );
    expect(repeatedActivity.body.proximaAccion.id).toBe(
      firstActivity.body.proximaAccion.id,
    );

    const secondActivity = await agent
      .post(`/api/projects/${projectA}/records/${recordId}/activities`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({
        solicitudId: '61000000-0000-4000-8000-000000000002',
        tipo: 'WHATSAPP',
        ocurridaEn: '2026-10-22T17:00:00.000Z',
        resumen: 'Confirmó que revisará la propuesta.',
      })
      .expect(201);

    const taskRequest = '62000000-0000-4000-8000-000000000001';
    const taskPayload = {
      solicitudId: taskRequest,
      descripcion: 'Llamar al encargado',
      tipo: 'LLAMADA',
      fechaVencimiento: '2026-11-01',
    };
    const firstTask = await agent
      .post(`/api/projects/${projectA}/records/${recordId}/tasks`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send(taskPayload)
      .expect(201);
    const repeatedTask = await agent
      .post(`/api/projects/${projectA}/records/${recordId}/tasks`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send(taskPayload)
      .expect(201);
    expect(repeatedTask.body.id).toBe(firstTask.body.id);

    const editPayload = {
      solicitudId: '63000000-0000-4000-8000-000000000001',
      descripcion: 'Llamar al encargado principal',
      fechaVencimiento: '2026-11-30',
    };
    await agent
      .patch(
        `/api/projects/${projectA}/records/${recordId}/tasks/${firstTask.body.id}`,
      )
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send(editPayload)
      .expect(200);
    await agent
      .patch(
        `/api/projects/${projectA}/records/${recordId}/tasks/${firstTask.body.id}`,
      )
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send(editPayload)
      .expect(200);

    const completePayload = {
      solicitudId: '64000000-0000-4000-8000-000000000001',
      resultado: 'Pidió retomar la conversación después del cierre mensual.',
      siguienteTarea: {
        descripcion: 'Volver a llamar',
        tipo: 'LLAMADA',
        fechaVencimiento: '2026-12-31',
      },
    };
    const firstCompletion = await agent
      .post(
        `/api/projects/${projectA}/records/${recordId}/tasks/${firstTask.body.id}/complete`,
      )
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send(completePayload)
      .expect(201);
    const repeatedCompletion = await agent
      .post(
        `/api/projects/${projectA}/records/${recordId}/tasks/${firstTask.body.id}/complete`,
      )
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send(completePayload)
      .expect(201);
    expect(repeatedCompletion.body.siguienteTarea.id).toBe(
      firstCompletion.body.siguienteTarea.id,
    );

    await agent
      .patch(`/api/projects/${projectA}/records/${recordId}`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({ etapa: 'CONTACTADO' })
      .expect(200);
    await agent
      .patch(`/api/projects/${projectA}/records/${recordId}`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({ etapa: 'CONTACTADO' })
      .expect(200);

    const detail = await agent
      .get(`/api/projects/${projectA}/records/${recordId}`)
      .expect(200);
    const activityIds = detail.body.actividades.map(
      (item: { id: string }) => item.id,
    );
    expect(activityIds).toContain(secondActivity.body.actividad.id);
    expect(activityIds.indexOf(secondActivity.body.actividad.id)).toBeLessThan(
      activityIds.indexOf(firstActivity.body.actividad.id),
    );
    expect(
      detail.body.actividades.filter(
        (item: { detalle: string }) =>
          item.detalle === 'Cambio de etapa comercial',
      ),
    ).toHaveLength(1);
    expect(
      detail.body.actividades.filter((item: { detalle: string }) =>
        item.detalle.startsWith('Seguimiento reprogramado:'),
      ),
    ).toHaveLength(1);
    expect(
      detail.body.actividades.filter((item: { detalle: string }) =>
        item.detalle.startsWith('Seguimiento completado:'),
      ),
    ).toHaveLength(1);
    expect(detail.body.actividades).toHaveLength(5);
    const completed = detail.body.tareasSeguimiento.find(
      (task: { id: string }) => task.id === firstTask.body.id,
    );
    expect(completed.estado).toBe('COMPLETADA');
    expect(completed.fechaVencimiento).toBe('2026-11-30');
    expect(completed.resultado).toContain('cierre mensual');
    expect(detail.body.tareasSeguimiento).toHaveLength(3);

    await agent
      .post(`/api/projects/${projectA}/records/${recordId}/tasks`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({
        solicitudId: '62000000-0000-4000-8000-000000000002',
        descripcion: 'Fecha imposible',
        tipo: 'OTRO',
        fechaVencimiento: '2026-02-31',
      })
      .expect(400);
  });

  it('aplica el semáforo y la pantalla Hoy con límites y exclusiones consistentes', async () => {
    const owner = await prisma.proyectoComercial.findUniqueOrThrow({
      where: { id: projectA },
      select: { usuarioId: true },
    });
    const project = await prisma.proyectoComercial.create({
      data: {
        usuarioId: owner.usuarioId,
        nombre: 'Proyecto exclusivo del semáforo',
      },
    });
    const initialDashboard = await agent
      .get(`/api/projects/${project.id}/today`)
      .expect(200);
    const today = initialDashboard.body.fechaHoy as string;
    const yesterday = addCalendarDays(today, -1);
    const thirdDay = addCalendarDays(today, 3);
    const fourthDay = addCalendarDays(today, 4);

    const records = await Promise.all([
      prisma.registroComercial.create({
        data: {
          proyectoId: project.id,
          nombreNegocio: 'Vencido activo',
          etapa: 'CONTACTADO',
          nivelInteres: 'ALTO',
        },
      }),
      prisma.registroComercial.create({
        data: {
          proyectoId: project.id,
          nombreNegocio: 'Vence hoy',
          etapa: 'DEMO_PENDIENTE',
        },
      }),
      prisma.registroComercial.create({
        data: {
          proyectoId: project.id,
          nombreNegocio: 'Seguimiento verde',
          etapa: 'CONTACTADO',
          nivelInteres: 'ALTO',
        },
      }),
      prisma.registroComercial.create({
        data: {
          proyectoId: project.id,
          nombreNegocio: 'Sin próxima acción',
          etapa: 'POR_CONTACTAR',
          nivelInteres: 'ALTO',
        },
      }),
      prisma.registroComercial.create({
        data: {
          proyectoId: project.id,
          nombreNegocio: 'Cliente con seguimiento',
          etapa: 'CLIENTE',
        },
      }),
      prisma.registroComercial.create({
        data: {
          proyectoId: project.id,
          nombreNegocio: 'Descartado vencido',
          etapa: 'DESCARTADO',
        },
      }),
      prisma.registroComercial.create({
        data: {
          proyectoId: project.id,
          nombreNegocio: 'Archivado vencido',
          etapa: 'CONTACTADO',
          archivadoEn: new Date(),
        },
      }),
    ]);
    const [overdue, dueToday, green, withoutNext, client, discarded, archived] =
      records;
    const calendar = (value: string) => new Date(`${value}T00:00:00.000Z`);
    const createdTasks = await Promise.all([
      prisma.tareaSeguimiento.create({
        data: {
          proyectoId: project.id,
          registroId: overdue.id,
          descripcion: 'Tarea vencida',
          tipo: 'LLAMADA',
          fechaVencimiento: calendar(yesterday),
        },
      }),
      prisma.tareaSeguimiento.create({
        data: {
          proyectoId: project.id,
          registroId: dueToday.id,
          descripcion: 'Tarea de hoy',
          tipo: 'WHATSAPP',
          fechaVencimiento: calendar(today),
        },
      }),
      prisma.tareaSeguimiento.create({
        data: {
          proyectoId: project.id,
          registroId: green.id,
          descripcion: 'Tarea posterior',
          tipo: 'VISITA',
          fechaVencimiento: calendar(fourthDay),
        },
      }),
      prisma.tareaSeguimiento.create({
        data: {
          proyectoId: project.id,
          registroId: withoutNext.id,
          descripcion: 'Tarea ya completada',
          tipo: 'OTRO',
          fechaVencimiento: calendar(yesterday),
          estado: 'COMPLETADA',
          completadaEn: new Date(),
        },
      }),
      prisma.tareaSeguimiento.create({
        data: {
          proyectoId: project.id,
          registroId: client.id,
          descripcion: 'Seguimiento de cliente',
          tipo: 'LLAMADA',
          fechaVencimiento: calendar(thirdDay),
        },
      }),
      prisma.tareaSeguimiento.create({
        data: {
          proyectoId: project.id,
          registroId: discarded.id,
          descripcion: 'No debe aparecer por descarte',
          tipo: 'OTRO',
          fechaVencimiento: calendar(yesterday),
        },
      }),
      prisma.tareaSeguimiento.create({
        data: {
          proyectoId: project.id,
          registroId: archived.id,
          descripcion: 'No debe aparecer por archivo',
          tipo: 'OTRO',
          fechaVencimiento: calendar(yesterday),
        },
      }),
    ]);
    const [overdueTask, todayTask] = createdTasks;
    await prisma.tareaSeguimiento.create({
      data: {
        proyectoId: project.id,
        registroId: overdue.id,
        descripcion: 'Tarea futura del mismo prospecto',
        tipo: 'VISITA',
        fechaVencimiento: calendar(fourthDay),
      },
    });

    const dashboard = await agent
      .get(`/api/projects/${project.id}/today`)
      .expect(200);
    expect(dashboard.body.indicadores).toEqual({
      prospectosActivos: 4,
      prospectosInteresAlto: 3,
      clientes: 1,
      tareasVencidas: 1,
    });
    expect(
      dashboard.body.vencidas.map((task: { id: string }) => task.id),
    ).toEqual([overdueTask.id]);
    expect(dashboard.body.hoy.map((task: { id: string }) => task.id)).toEqual([
      todayTask.id,
    ]);
    expect(
      dashboard.body.proximosTresDias.map(
        (task: { registro: { id: string } }) => task.registro.id,
      ),
    ).toEqual([client.id]);
    expect(
      dashboard.body.prospectosSinProximaAccion.map(
        (record: { id: string }) => record.id,
      ),
    ).toEqual([withoutNext.id]);

    const list = await agent
      .get(`/api/projects/${project.id}/records?pageSize=50`)
      .expect(200);
    const statusByRecord = Object.fromEntries(
      list.body.items.map((record: { id: string; semaforo: string }) => [
        record.id,
        record.semaforo,
      ]),
    );
    expect(statusByRecord[overdue.id]).toBe('ROJO');
    expect(statusByRecord[dueToday.id]).toBe('AMARILLO');
    expect(statusByRecord[client.id]).toBe('AMARILLO');
    expect(statusByRecord[green.id]).toBe('VERDE');
    expect(statusByRecord[withoutNext.id]).toBe('GRIS');
    expect(statusByRecord[discarded.id]).toBe('GRIS');
    const greenDetail = await agent
      .get(`/api/projects/${project.id}/records/${green.id}`)
      .expect(200);
    expect(greenDetail.body.semaforo).toBe('VERDE');
    const archivedList = await agent
      .get(`/api/projects/${project.id}/records?archived=true`)
      .expect(200);
    expect(archivedList.body.items[0].semaforo).toBe('GRIS');

    await agent
      .patch(
        `/api/projects/${project.id}/records/${dueToday.id}/tasks/${todayTask.id}`,
      )
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({
        solicitudId: '71000000-0000-4000-8000-000000000001',
        fechaVencimiento: fourthDay,
      })
      .expect(200);
    await agent
      .post(
        `/api/projects/${project.id}/records/${overdue.id}/tasks/${overdueTask.id}/complete`,
      )
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({ solicitudId: '71000000-0000-4000-8000-000000000002' })
      .expect(201);

    const refreshed = await agent
      .get(`/api/projects/${project.id}/today`)
      .expect(200);
    expect(refreshed.body.vencidas).toHaveLength(0);
    expect(refreshed.body.hoy).toHaveLength(0);
    expect(refreshed.body.indicadores.tareasVencidas).toBe(0);
    expect(
      refreshed.body.prospectosSinProximaAccion.map(
        (record: { id: string }) => record.id,
      ),
    ).toEqual([withoutNext.id]);
  });

  it('no mezcla actividades ni tareas entre proyectos', async () => {
    await agent
      .get(
        `/api/projects/${projectA}/records/${recordA}/activities/${activityB}`,
      )
      .expect(404);
    await agent
      .get(`/api/projects/${projectA}/records/${recordA}/tasks/${taskB}`)
      .expect(404);
    await agent
      .post(`/api/projects/${projectA}/records/${recordB}/activities`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({
        solicitudId: '65000000-0000-4000-8000-000000000001',
        tipo: 'NOTA',
        ocurridaEn: '2026-10-21T20:00:00.000Z',
        resumen: 'Intento cruzado',
      })
      .expect(404);
    await agent
      .post(
        `/api/projects/${projectA}/records/${recordA}/tasks/${taskB}/complete`,
      )
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({ solicitudId: '65000000-0000-4000-8000-000000000002' })
      .expect(404);
  });

  it('exige CSRF en mutaciones autenticadas', async () => {
    await agent
      .patch(`/api/projects/${projectA}/records/${recordA}`)
      .set('Origin', 'http://localhost:4200')
      .send({ nombreNegocio: 'Sin token' })
      .expect(403);
  });

  it('archiva sin borrar datos, bloquea cambios y permite restaurar', async () => {
    await agent
      .post(`/api/projects/${projectA}/archive`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({})
      .expect(201);

    const active = await agent.get('/api/projects').expect(200);
    expect(
      active.body.map((project: { id: string }) => project.id),
    ).not.toContain(projectA);
    const archived = await agent.get('/api/projects/archived').expect(200);
    expect(
      archived.body.map((project: { id: string }) => project.id),
    ).toContain(projectA);

    await agent.get(`/api/projects/${projectA}/records/${recordA}`).expect(200);
    await agent
      .patch(`/api/projects/${projectA}/records/${recordA}`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({ nombreNegocio: 'No debe cambiar' })
      .expect(409);

    await agent
      .post(`/api/projects/${projectA}/restore`)
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .send({})
      .expect(201);

    const project = await prisma.proyectoComercial.findUniqueOrThrow({
      where: { id: projectA },
    });
    const record = await prisma.registroComercial.findUniqueOrThrow({
      where: { id: recordA },
    });
    expect(project.archivadoEn).toBeNull();
    expect(record.nombreNegocio).toBe('Negocio A');
  });

  it('limita intentos de inicio de sesión', async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('Origin', 'http://localhost:4200')
        .send({
          correo: 'desconocido@prueba.local',
          password: 'incorrecta-1234',
        })
        .expect(401);
    }
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:4200')
      .send({ correo: 'desconocido@prueba.local', password: 'incorrecta-1234' })
      .expect(429);
  });

  it('cierra la sesión e invalida la cookie', async () => {
    await agent
      .post('/api/auth/logout')
      .set('Origin', 'http://localhost:4200')
      .set('X-CSRF-Token', csrfToken)
      .expect(201);
    await agent.get(`/api/projects/${projectA}/records`).expect(401);
  });

  afterAll(async () => {
    if (app) await app.close();
  });
});
