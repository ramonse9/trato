import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectAccessService } from '../projects/project-access.service.js';
import {
  calculateFollowUpStatus,
  calendarDateValue,
} from '../records/follow-up-status.js';
import { ListFollowUpsQueryDto } from './dto/list-follow-ups-query.dto.js';

@Injectable()
export class FollowUpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async list(userId: string, projectId: string, query: ListFollowUpsQueryDto) {
    await this.access.requireActiveProject(userId, projectId);
    const from = query.desde ? this.calendarDate(query.desde) : undefined;
    const to = query.hasta ? this.calendarDate(query.hasta) : undefined;
    if (query.desde && query.hasta && query.desde > query.hasta) {
      throw new BadRequestException('El rango de fechas no es válido.');
    }

    const dateFilter: Prisma.DateTimeFilter = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
    const tasks = await this.prisma.tareaSeguimiento.findMany({
      where: {
        proyectoId: projectId,
        ...(query.estado ? { estado: query.estado } : {}),
        ...(from || to ? { fechaVencimiento: dateFilter } : {}),
        registro: {
          proyecto: { usuarioId: userId },
          archivadoEn: null,
          etapa: { not: 'DESCARTADO' },
        },
      },
      orderBy: [
        { estado: 'asc' },
        { fechaVencimiento: 'asc' },
        { creadaEn: 'asc' },
      ],
      select: {
        id: true,
        descripcion: true,
        tipo: true,
        fechaVencimiento: true,
        estado: true,
        completadaEn: true,
        resultado: true,
        registro: {
          select: {
            id: true,
            nombreNegocio: true,
            nombreEncargado: true,
            etapa: true,
            nivelInteres: true,
          },
        },
      },
    });

    return {
      items: tasks.map((task) => {
        const dueDate = calendarDateValue(task.fechaVencimiento);
        return {
          ...task,
          fechaVencimiento: dueDate,
          semaforo:
            task.estado === 'PENDIENTE'
              ? calculateFollowUpStatus(dueDate)
              : 'GRIS',
        };
      }),
      total: tasks.length,
    };
  }

  private calendarDate(value: string): Date {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || calendarDateValue(date) !== value) {
      throw new BadRequestException('La fecha no es válida.');
    }
    return date;
  }
}
