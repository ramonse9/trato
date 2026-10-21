import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  EstadoTarea,
  EtapaComercial,
  NivelInteres,
  PrismaClient,
  TipoActividad,
  TipoTarea,
} from '../src/generated/prisma/client.js';

loadEnv({ path: resolve(process.cwd(), '../../.env') });

if ((process.env.NODE_ENV ?? 'development').toLowerCase() === 'production') {
  throw new Error('El seed de ejemplo está deshabilitado en producción.');
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'La variable DATABASE_URL es obligatoria para ejecutar el seed.',
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const ids = {
  usuario: '10000000-0000-4000-8000-000000000001',
  proyectoCosta: '20000000-0000-4000-8000-000000000001',
  proyectoNorte: '20000000-0000-4000-8000-000000000002',
  cafeteriaOlas: '30000000-0000-4000-8000-000000000001',
  panPuerto: '30000000-0000-4000-8000-000000000002',
  mercadoRios: '30000000-0000-4000-8000-000000000003',
  abarrotesNorte: '30000000-0000-4000-8000-000000000004',
} as const;

function fechaCalendarioEn(dias: number): Date {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mazatlan',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const valor = (tipo: Intl.DateTimeFormatPartTypes): number =>
    Number(partes.find((parte) => parte.type === tipo)?.value);

  return new Date(
    Date.UTC(valor('year'), valor('month') - 1, valor('day') + dias),
  );
}

async function main(): Promise<void> {
  await prisma.usuario.upsert({
    where: { id: ids.usuario },
    update: { nombre: 'Usuario de desarrollo' },
    create: {
      id: ids.usuario,
      nombre: 'Usuario de desarrollo',
      correo: 'desarrollo@trato.local',
    },
  });

  await prisma.proyectoComercial.upsert({
    where: { id: ids.proyectoCosta },
    update: {
      nombre: 'Ruta Costa',
      descripcion: 'Cartera ficticia de cafeterías y restaurantes de Mazatlán.',
    },
    create: {
      id: ids.proyectoCosta,
      usuarioId: ids.usuario,
      nombre: 'Ruta Costa',
      descripcion: 'Cartera ficticia de cafeterías y restaurantes de Mazatlán.',
    },
  });

  await prisma.proyectoComercial.upsert({
    where: { id: ids.proyectoNorte },
    update: {
      nombre: 'Distribución Norte',
      descripcion: 'Cartera ficticia de comercios de Culiacán.',
    },
    create: {
      id: ids.proyectoNorte,
      usuarioId: ids.usuario,
      nombre: 'Distribución Norte',
      descripcion: 'Cartera ficticia de comercios de Culiacán.',
    },
  });

  await prisma.registroComercial.upsert({
    where: { id: ids.cafeteriaOlas },
    update: {},
    create: {
      id: ids.cafeteriaOlas,
      proyectoId: ids.proyectoCosta,
      nombreNegocio: 'Cafetería Las Olas',
      nombreEncargado: 'Marina Soto',
      telefono: '+526691234567',
      direccion: 'Zona Dorada, Mazatlán, Sinaloa',
      latitud: '23.248610',
      longitud: '-106.455310',
      etapa: EtapaComercial.CLIENTE,
      nivelInteres: NivelInteres.ALTO,
      notasGenerales: 'Cliente ficticio exclusivo del proyecto Ruta Costa.',
    },
  });

  await prisma.registroComercial.upsert({
    where: { id: ids.panPuerto },
    update: {},
    create: {
      id: ids.panPuerto,
      proyectoId: ids.proyectoCosta,
      nombreNegocio: 'Pan del Puerto',
      nombreEncargado: 'Óscar Valle',
      telefono: '+526699876543',
      etapa: EtapaComercial.CONTACTADO,
      nivelInteres: NivelInteres.MEDIO,
      notasGenerales: 'Prospecto ficticio exclusivo del proyecto Ruta Costa.',
    },
  });

  await prisma.registroComercial.upsert({
    where: { id: ids.mercadoRios },
    update: {},
    create: {
      id: ids.mercadoRios,
      proyectoId: ids.proyectoNorte,
      nombreNegocio: 'Mercado Tres Ríos',
      nombreEncargado: 'Laura Beltrán',
      telefono: '+526671112233',
      etapa: EtapaComercial.DEMO_PENDIENTE,
      nivelInteres: NivelInteres.ALTO,
      notasGenerales:
        'Prospecto ficticio exclusivo del proyecto Distribución Norte.',
    },
  });

  await prisma.registroComercial.upsert({
    where: { id: ids.abarrotesNorte },
    update: {},
    create: {
      id: ids.abarrotesNorte,
      proyectoId: ids.proyectoNorte,
      nombreNegocio: 'Abarrotes El Norte',
      etapa: EtapaComercial.POR_CONTACTAR,
      nivelInteres: NivelInteres.SIN_EVALUAR,
      notasGenerales:
        'Prospecto ficticio exclusivo del proyecto Distribución Norte.',
    },
  });

  await prisma.actividad.upsert({
    where: { id: '40000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '40000000-0000-4000-8000-000000000001',
      proyectoId: ids.proyectoCosta,
      registroId: ids.panPuerto,
      tipo: TipoActividad.WHATSAPP,
      detalle: 'Se envió una presentación y se solicitó confirmación.',
      ocurridaEn: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  });

  await prisma.actividad.upsert({
    where: { id: '40000000-0000-4000-8000-000000000002' },
    update: {},
    create: {
      id: '40000000-0000-4000-8000-000000000002',
      proyectoId: ids.proyectoNorte,
      registroId: ids.mercadoRios,
      tipo: TipoActividad.VISITA,
      detalle: 'Se realizó una visita inicial y se acordó preparar una demo.',
      ocurridaEn: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.tareaSeguimiento.upsert({
    where: { id: '50000000-0000-4000-8000-000000000001' },
    update: { fechaVencimiento: fechaCalendarioEn(2) },
    create: {
      id: '50000000-0000-4000-8000-000000000001',
      proyectoId: ids.proyectoCosta,
      registroId: ids.panPuerto,
      descripcion: 'Esperando respuesta a la presentación enviada',
      tipo: TipoTarea.WHATSAPP,
      fechaVencimiento: fechaCalendarioEn(2),
      estado: EstadoTarea.PENDIENTE,
    },
  });

  await prisma.tareaSeguimiento.upsert({
    where: { id: '50000000-0000-4000-8000-000000000002' },
    update: { fechaVencimiento: fechaCalendarioEn(30) },
    create: {
      id: '50000000-0000-4000-8000-000000000002',
      proyectoId: ids.proyectoNorte,
      registroId: ids.abarrotesNorte,
      descripcion: 'Visitar en un mes',
      tipo: TipoTarea.VISITA,
      fechaVencimiento: fechaCalendarioEn(30),
      estado: EstadoTarea.PENDIENTE,
    },
  });

  console.log(
    'Seed de desarrollo aplicado: 1 usuario, 2 proyectos y 4 registros separados.',
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
