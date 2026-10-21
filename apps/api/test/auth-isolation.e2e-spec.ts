import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { hashPassword } from '../src/auth/password.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

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
        data: { nombreNegocio: 'Negocio A', proyectoId: projectA },
      }),
      prisma.registroComercial.create({
        data: { nombreNegocio: 'Negocio B', proyectoId: projectB },
      }),
    ]);
    recordA = createdRecordA.id;
    recordB = createdRecordB.id;

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

    const unchanged = await prisma.registroComercial.findUniqueOrThrow({
      where: { id: recordB },
    });
    expect(unchanged.nombreNegocio).toBe('Negocio B');
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
