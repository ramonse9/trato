import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { EstadoTarea } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectAccessService } from '../projects/project-access.service.js';
import { CreateRecordDto } from './dto/create-record.dto.js';
import { ListRecordsQueryDto } from './dto/list-records-query.dto.js';
import { UpdateRecordDto } from './dto/update-record.dto.js';

const recordSelect = {
  id: true,
  proyectoId: true,
  nombreNegocio: true,
  nombreEncargado: true,
  telefono: true,
  correo: true,
  direccion: true,
  latitud: true,
  longitud: true,
  notasGenerales: true,
  etapa: true,
  nivelInteres: true,
  motivoDescarte: true,
  creadoEn: true,
  actualizadoEn: true,
  archivadoEn: true,
} as const;

@Injectable()
export class RecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async list(userId: string, projectId: string, query: ListRecordsQueryDto) {
    await this.access.requireProject(userId, projectId);
    const where: Prisma.RegistroComercialWhereInput = {
      proyectoId: projectId,
      proyecto: { usuarioId: userId },
      archivadoEn: query.archived ? { not: null } : null,
      ...(query.etapa ? { etapa: query.etapa } : {}),
      ...(query.nivelInteres ? { nivelInteres: query.nivelInteres } : {}),
      ...(query.search
        ? {
            OR: [
              {
                nombreNegocio: { contains: query.search, mode: 'insensitive' },
              },
              {
                nombreEncargado: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              { telefono: { contains: query.search } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [total, records] = await this.prisma.$transaction([
      this.prisma.registroComercial.count({ where }),
      this.prisma.registroComercial.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: [{ nombreNegocio: 'asc' }, { id: 'asc' }],
        select: {
          ...recordSelect,
          actividades: {
            orderBy: { ocurridaEn: 'desc' },
            take: 1,
            select: { id: true, tipo: true, ocurridaEn: true },
          },
          tareasSeguimiento: {
            where: { estado: EstadoTarea.PENDIENTE },
            orderBy: [{ fechaVencimiento: 'asc' }, { creadaEn: 'asc' }],
            take: 1,
            select: {
              id: true,
              descripcion: true,
              tipo: true,
              fechaVencimiento: true,
            },
          },
        },
      }),
    ]);

    return {
      items: records.map(({ actividades, tareasSeguimiento, ...record }) => ({
        ...record,
        ultimoContacto: actividades[0] ?? null,
        proximaAccion: tareasSeguimiento[0]
          ? {
              ...tareasSeguimiento[0],
              fechaVencimiento: this.calendarDate(
                tareasSeguimiento[0].fechaVencimiento,
              ),
            }
          : null,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  async get(userId: string, projectId: string, recordId: string) {
    await this.access.requireRecord(userId, projectId, recordId);
    const record = await this.prisma.registroComercial.findUniqueOrThrow({
      where: { id_proyectoId: { id: recordId, proyectoId: projectId } },
      select: {
        ...recordSelect,
        actividades: {
          orderBy: { ocurridaEn: 'desc' },
          select: {
            id: true,
            tipo: true,
            detalle: true,
            ocurridaEn: true,
          },
        },
        tareasSeguimiento: {
          orderBy: [{ estado: 'asc' }, { fechaVencimiento: 'asc' }],
          select: {
            id: true,
            descripcion: true,
            tipo: true,
            fechaVencimiento: true,
            estado: true,
            completadaEn: true,
          },
        },
      },
    });

    return {
      ...record,
      tareasSeguimiento: record.tareasSeguimiento.map((task) => ({
        ...task,
        fechaVencimiento: this.calendarDate(task.fechaVencimiento),
      })),
    };
  }

  async create(userId: string, projectId: string, dto: CreateRecordDto) {
    await this.access.requireActiveProject(userId, projectId);
    return this.prisma.registroComercial.create({
      data: { proyectoId: projectId, nombreNegocio: dto.nombreNegocio },
      select: recordSelect,
    });
  }

  async update(
    userId: string,
    projectId: string,
    recordId: string,
    dto: UpdateRecordDto,
  ) {
    await this.access.requireActiveRecord(userId, projectId, recordId);
    return this.prisma.registroComercial.update({
      where: { id_proyectoId: { id: recordId, proyectoId: projectId } },
      data: dto,
      select: recordSelect,
    });
  }

  async archive(userId: string, projectId: string, recordId: string) {
    await this.access.requireActiveRecord(userId, projectId, recordId);
    return this.prisma.registroComercial.update({
      where: { id_proyectoId: { id: recordId, proyectoId: projectId } },
      data: { archivadoEn: new Date() },
      select: recordSelect,
    });
  }

  async restore(userId: string, projectId: string, recordId: string) {
    await this.access.requireActiveProject(userId, projectId);
    const record = await this.access.requireRecord(userId, projectId, recordId);
    if (!record.archivadoEn) return this.get(userId, projectId, recordId);

    return this.prisma.registroComercial.update({
      where: { id_proyectoId: { id: recordId, proyectoId: projectId } },
      data: { archivadoEn: null },
      select: recordSelect,
    });
  }

  getActivity(
    userId: string,
    projectId: string,
    recordId: string,
    activityId: string,
  ) {
    return this.access.requireActivity(userId, projectId, recordId, activityId);
  }

  getTask(userId: string, projectId: string, recordId: string, taskId: string) {
    return this.access.requireTask(userId, projectId, recordId, taskId);
  }

  private calendarDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
