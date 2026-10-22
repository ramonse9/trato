import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client.js';
import {
  EstadoTarea,
  EtapaComercial,
  NivelInteres,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectAccessService } from '../projects/project-access.service.js';
import { CreateRecordDto } from './dto/create-record.dto.js';
import { ListRecordsQueryDto } from './dto/list-records-query.dto.js';
import { UpdateRecordDto } from './dto/update-record.dto.js';
import {
  CompleteTaskDto,
  CreateActivityDto,
  CreateTaskDto,
  UpdateTaskDto,
} from './dto/follow-up.dto.js';
import {
  calculateFollowUpStatus,
  calendarDateValue as serializeCalendarDate,
} from './follow-up-status.js';
import { createCsv } from './csv-export.js';

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
      items: records.map(({ actividades, tareasSeguimiento, ...record }) => {
        const nextTask = tareasSeguimiento[0];
        const nextDate = nextTask
          ? serializeCalendarDate(nextTask.fechaVencimiento)
          : null;
        const excluded = record.archivadoEn || record.etapa === 'DESCARTADO';
        return {
          ...record,
          ultimoContacto: actividades[0] ?? null,
          proximaAccion: nextTask
            ? { ...nextTask, fechaVencimiento: nextDate }
            : null,
          semaforo: calculateFollowUpStatus(excluded ? null : nextDate),
        };
      }),
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
            resultado: true,
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
            resultado: true,
            creadaEn: true,
            actualizadaEn: true,
          },
        },
      },
    });

    const tasks = record.tareasSeguimiento.map((task) => ({
      ...task,
      fechaVencimiento: serializeCalendarDate(task.fechaVencimiento),
    }));
    const nextTask = tasks
      .filter((task) => task.estado === EstadoTarea.PENDIENTE)
      .sort((left, right) =>
        left.fechaVencimiento.localeCompare(right.fechaVencimiento),
      )[0];
    return {
      ...record,
      tareasSeguimiento: tasks,
      semaforo: calculateFollowUpStatus(
        record.archivadoEn || record.etapa === 'DESCARTADO'
          ? null
          : (nextTask?.fechaVencimiento ?? null),
      ),
    };
  }

  async exportCsv(userId: string, projectId: string): Promise<string> {
    await this.access.requireActiveProject(userId, projectId);
    const records = await this.prisma.registroComercial.findMany({
      where: {
        proyectoId: projectId,
        proyecto: { usuarioId: userId },
      },
      orderBy: [{ nombreNegocio: 'asc' }, { id: 'asc' }],
      select: {
        nombreNegocio: true,
        nombreEncargado: true,
        telefono: true,
        correo: true,
        direccion: true,
        etapa: true,
        nivelInteres: true,
        archivadoEn: true,
        tareasSeguimiento: {
          where: { estado: EstadoTarea.PENDIENTE },
          orderBy: [{ fechaVencimiento: 'asc' }, { creadaEn: 'asc' }],
          take: 1,
          select: { descripcion: true, fechaVencimiento: true },
        },
      },
    });

    return createCsv([
      [
        'Nombre del negocio',
        'Encargado',
        'Teléfono',
        'Correo',
        'Dirección',
        'Etapa comercial',
        'Nivel de interés',
        'Próxima acción',
        'Fecha de próxima acción',
        'Archivado',
      ],
      ...records.map((record) => {
        const nextTask = record.tareasSeguimiento[0];
        return [
          record.nombreNegocio,
          record.nombreEncargado,
          record.telefono,
          record.correo,
          record.direccion,
          this.stageLabel(record.etapa),
          this.interestLabel(record.nivelInteres),
          nextTask?.descripcion,
          nextTask ? serializeCalendarDate(nextTask.fechaVencimiento) : null,
          record.archivadoEn ? 'Sí' : 'No',
        ];
      }),
    ]);
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
    const current = await this.access.requireActiveRecord(
      userId,
      projectId,
      recordId,
    );
    const stageChanged = dto.etapa !== undefined && dto.etapa !== current.etapa;
    const latitude = dto.latitud !== undefined ? dto.latitud : current.latitud;
    const longitude =
      dto.longitud !== undefined ? dto.longitud : current.longitud;
    if ((latitude === null) !== (longitude === null)) {
      throw new BadRequestException(
        'La latitud y la longitud deben guardarse juntas.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.registroComercial.update({
        where: { id_proyectoId: { id: recordId, proyectoId: projectId } },
        data: dto,
        select: recordSelect,
      });
      if (stageChanged && dto.etapa) {
        await tx.actividad.create({
          data: {
            proyectoId: projectId,
            registroId: recordId,
            tipo: 'NOTA',
            detalle: 'Cambio de etapa comercial',
            resultado: `${this.stageLabel(current.etapa)} → ${this.stageLabel(dto.etapa)}`,
          },
        });
      }
      return record;
    });
  }

  async createActivity(
    userId: string,
    projectId: string,
    recordId: string,
    dto: CreateActivityDto,
  ) {
    await this.access.requireActiveRecord(userId, projectId, recordId);
    const existing = await this.findOperation(
      dto.solicitudId,
      projectId,
      recordId,
      'CREAR_ACTIVIDAD',
    );
    if (existing) return this.activityOperationResult(existing);

    const activityId = randomUUID();
    const taskId = dto.proximaAccion ? randomUUID() : null;
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.actividad.create({
          data: {
            id: activityId,
            proyectoId: projectId,
            registroId: recordId,
            tipo: dto.tipo,
            detalle: dto.resumen,
            resultado: dto.resultado,
            ocurridaEn: this.timestamp(dto.ocurridaEn),
          },
        });
        if (dto.proximaAccion && taskId) {
          await tx.tareaSeguimiento.create({
            data: {
              id: taskId,
              proyectoId: projectId,
              registroId: recordId,
              descripcion: dto.proximaAccion.descripcion,
              tipo: dto.proximaAccion.tipo,
              fechaVencimiento: this.calendarDateValue(
                dto.proximaAccion.fechaVencimiento,
              ),
            },
          });
        }
        if (dto.nivelInteres) {
          await tx.registroComercial.update({
            where: { id_proyectoId: { id: recordId, proyectoId: projectId } },
            data: { nivelInteres: dto.nivelInteres },
          });
        }
        await tx.operacionRegistro.create({
          data: {
            solicitudId: dto.solicitudId,
            proyectoId: projectId,
            registroId: recordId,
            tipo: 'CREAR_ACTIVIDAD',
            actividadId: activityId,
            tareaId: taskId,
          },
        });
      });
    } catch (error) {
      if (!this.isUniqueConflict(error)) throw error;
      const repeated = await this.requireOperation(
        dto.solicitudId,
        projectId,
        recordId,
        'CREAR_ACTIVIDAD',
      );
      return this.activityOperationResult(repeated);
    }
    return this.activityOperationResult({
      actividadId: activityId,
      tareaId: taskId,
    });
  }

  async createTask(
    userId: string,
    projectId: string,
    recordId: string,
    dto: CreateTaskDto,
  ) {
    await this.access.requireActiveRecord(userId, projectId, recordId);
    const existing = await this.findOperation(
      dto.solicitudId,
      projectId,
      recordId,
      'CREAR_TAREA',
    );
    if (existing?.tareaId) return this.taskById(existing.tareaId);

    const taskId = randomUUID();
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.tareaSeguimiento.create({
          data: {
            id: taskId,
            proyectoId: projectId,
            registroId: recordId,
            descripcion: dto.descripcion,
            tipo: dto.tipo,
            fechaVencimiento: this.calendarDateValue(dto.fechaVencimiento),
          },
        });
        await tx.operacionRegistro.create({
          data: {
            solicitudId: dto.solicitudId,
            proyectoId: projectId,
            registroId: recordId,
            tipo: 'CREAR_TAREA',
            tareaId: taskId,
          },
        });
      });
    } catch (error) {
      if (!this.isUniqueConflict(error)) throw error;
      const repeated = await this.requireOperation(
        dto.solicitudId,
        projectId,
        recordId,
        'CREAR_TAREA',
      );
      if (!repeated.tareaId) throw new ConflictException('Solicitud inválida.');
      return this.taskById(repeated.tareaId);
    }
    return this.taskById(taskId);
  }

  async updateTask(
    userId: string,
    projectId: string,
    recordId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ) {
    await this.access.requireActiveRecord(userId, projectId, recordId);
    const operationType = `EDITAR_TAREA:${taskId}`;
    const existing = await this.findOperation(
      dto.solicitudId,
      projectId,
      recordId,
      operationType,
    );
    if (existing?.tareaId) return this.taskById(existing.tareaId);
    if (
      dto.descripcion === undefined &&
      dto.tipo === undefined &&
      dto.fechaVencimiento === undefined
    ) {
      throw new BadRequestException('La tarea no contiene cambios.');
    }

    const current = await this.access.requireTask(
      userId,
      projectId,
      recordId,
      taskId,
    );
    if (current.estado === EstadoTarea.COMPLETADA) {
      throw new ConflictException('Una tarea completada no puede modificarse.');
    }
    const oldDate = serializeCalendarDate(current.fechaVencimiento);
    const newDate = dto.fechaVencimiento ?? oldDate;
    const reprogrammed = oldDate !== newDate;
    const activityId = reprogrammed ? randomUUID() : null;

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.tareaSeguimiento.update({
          where: { id: taskId },
          data: {
            descripcion: dto.descripcion,
            tipo: dto.tipo,
            fechaVencimiento: dto.fechaVencimiento
              ? this.calendarDateValue(dto.fechaVencimiento)
              : undefined,
          },
        });
        if (activityId) {
          await tx.actividad.create({
            data: {
              id: activityId,
              proyectoId: projectId,
              registroId: recordId,
              tipo: 'NOTA',
              detalle: `Seguimiento reprogramado: ${current.descripcion}`,
              resultado: `${oldDate} → ${newDate}`,
            },
          });
        }
        await tx.operacionRegistro.create({
          data: {
            solicitudId: dto.solicitudId,
            proyectoId: projectId,
            registroId: recordId,
            tipo: operationType,
            actividadId: activityId,
            tareaId: taskId,
          },
        });
      });
    } catch (error) {
      if (!this.isUniqueConflict(error)) throw error;
      const repeated = await this.requireOperation(
        dto.solicitudId,
        projectId,
        recordId,
        operationType,
      );
      if (!repeated.tareaId) throw new ConflictException('Solicitud inválida.');
      return this.taskById(repeated.tareaId);
    }
    return this.taskById(taskId);
  }

  async completeTask(
    userId: string,
    projectId: string,
    recordId: string,
    taskId: string,
    dto: CompleteTaskDto,
  ) {
    await this.access.requireActiveRecord(userId, projectId, recordId);
    const operationType = `COMPLETAR_TAREA:${taskId}`;
    const existing = await this.findOperation(
      dto.solicitudId,
      projectId,
      recordId,
      operationType,
    );
    if (existing) {
      return {
        tarea: await this.taskById(taskId),
        siguienteTarea: existing.tareaId
          ? await this.taskById(existing.tareaId)
          : null,
      };
    }

    const current = await this.access.requireTask(
      userId,
      projectId,
      recordId,
      taskId,
    );
    if (current.estado === EstadoTarea.COMPLETADA) {
      throw new ConflictException('La tarea ya está completada.');
    }
    const activityId = randomUUID();
    const nextTaskId = dto.siguienteTarea ? randomUUID() : null;
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.tareaSeguimiento.update({
          where: { id: taskId },
          data: {
            estado: EstadoTarea.COMPLETADA,
            completadaEn: new Date(),
            resultado: dto.resultado,
          },
        });
        await tx.actividad.create({
          data: {
            id: activityId,
            proyectoId: projectId,
            registroId: recordId,
            tipo: 'NOTA',
            detalle: `Seguimiento completado: ${current.descripcion}`,
            resultado: dto.resultado,
          },
        });
        if (dto.siguienteTarea && nextTaskId) {
          await tx.tareaSeguimiento.create({
            data: {
              id: nextTaskId,
              proyectoId: projectId,
              registroId: recordId,
              descripcion: dto.siguienteTarea.descripcion,
              tipo: dto.siguienteTarea.tipo,
              fechaVencimiento: this.calendarDateValue(
                dto.siguienteTarea.fechaVencimiento,
              ),
            },
          });
        }
        await tx.operacionRegistro.create({
          data: {
            solicitudId: dto.solicitudId,
            proyectoId: projectId,
            registroId: recordId,
            tipo: operationType,
            actividadId: activityId,
            tareaId: nextTaskId,
          },
        });
      });
    } catch (error) {
      if (!this.isUniqueConflict(error)) throw error;
      const repeated = await this.requireOperation(
        dto.solicitudId,
        projectId,
        recordId,
        operationType,
      );
      return {
        tarea: await this.taskById(taskId),
        siguienteTarea: repeated.tareaId
          ? await this.taskById(repeated.tareaId)
          : null,
      };
    }
    return {
      tarea: await this.taskById(taskId),
      siguienteTarea: nextTaskId ? await this.taskById(nextTaskId) : null,
    };
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

  private calendarDateValue(value: string): Date {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || serializeCalendarDate(date) !== value) {
      throw new BadRequestException('La fecha de vencimiento no es válida.');
    }
    return date;
  }

  private timestamp(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('La fecha y hora no son válidas.');
    }
    return date;
  }

  private stageLabel(stage: EtapaComercial): string {
    const labels: Record<EtapaComercial, string> = {
      POR_CONTACTAR: 'Por contactar',
      BUSCANDO_ENCARGADO: 'Buscando al encargado',
      CONTACTADO: 'Contactado',
      DEMO_PENDIENTE: 'Demo pendiente',
      DEMO_REALIZADA: 'Demo realizada',
      PROPUESTA_ENVIADA: 'Propuesta enviada',
      EN_NEGOCIACION: 'En negociación',
      CLIENTE: 'Cliente',
      DESCARTADO: 'Descartado',
    };
    return labels[stage];
  }

  private interestLabel(interest: NivelInteres): string {
    const labels: Record<NivelInteres, string> = {
      SIN_EVALUAR: 'Sin evaluar',
      BAJO: 'Bajo',
      MEDIO: 'Medio',
      ALTO: 'Alto',
    };
    return labels[interest];
  }

  private async findOperation(
    solicitudId: string,
    projectId: string,
    recordId: string,
    type: string,
  ) {
    const operation = await this.prisma.operacionRegistro.findUnique({
      where: { solicitudId },
    });
    if (
      operation &&
      (operation.proyectoId !== projectId ||
        operation.registroId !== recordId ||
        operation.tipo !== type)
    ) {
      throw new ConflictException(
        'El identificador de solicitud ya fue utilizado.',
      );
    }
    return operation;
  }

  private async requireOperation(
    solicitudId: string,
    projectId: string,
    recordId: string,
    type: string,
  ) {
    const operation = await this.findOperation(
      solicitudId,
      projectId,
      recordId,
      type,
    );
    if (!operation)
      throw new ConflictException('No fue posible repetir la solicitud.');
    return operation;
  }

  private isUniqueConflict(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }

  private async activityOperationResult(operation: {
    actividadId: string | null;
    tareaId: string | null;
  }) {
    if (!operation.actividadId) {
      throw new ConflictException('Solicitud inválida.');
    }
    const [activity, task] = await Promise.all([
      this.prisma.actividad.findUniqueOrThrow({
        where: { id: operation.actividadId },
      }),
      operation.tareaId
        ? this.taskById(operation.tareaId)
        : Promise.resolve(null),
    ]);
    return {
      actividad: activity,
      proximaAccion: task,
    };
  }

  private async taskById(taskId: string) {
    const task = await this.prisma.tareaSeguimiento.findUniqueOrThrow({
      where: { id: taskId },
    });
    return {
      ...task,
      fechaVencimiento: serializeCalendarDate(task.fechaVencimiento),
    };
  }
}
