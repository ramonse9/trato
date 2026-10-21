import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { EstadoTarea } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectAccessService } from '../projects/project-access.service.js';
import {
  addCalendarDays,
  calculateFollowUpStatus,
  calendarDateInMazatlan,
  calendarDateValue,
  classifyTaskDate,
} from '../records/follow-up-status.js';

@Injectable()
export class TodayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async get(userId: string, projectId: string) {
    await this.access.requireActiveProject(userId, projectId);
    const today = calendarDateInMazatlan();
    const lastUpcomingDay = addCalendarDays(today, 3);
    const activeProspectWhere: Prisma.RegistroComercialWhereInput = {
      proyectoId: projectId,
      proyecto: { usuarioId: userId },
      archivadoEn: null,
      etapa: { notIn: ['CLIENTE', 'DESCARTADO'] },
    };

    const [
      activeProspects,
      highInterestProspects,
      clients,
      tasks,
      withoutTask,
    ] = await this.prisma.$transaction([
      this.prisma.registroComercial.count({ where: activeProspectWhere }),
      this.prisma.registroComercial.count({
        where: { ...activeProspectWhere, nivelInteres: 'ALTO' },
      }),
      this.prisma.registroComercial.count({
        where: {
          proyectoId: projectId,
          proyecto: { usuarioId: userId },
          archivadoEn: null,
          etapa: 'CLIENTE',
        },
      }),
      this.prisma.tareaSeguimiento.findMany({
        where: {
          proyectoId: projectId,
          estado: EstadoTarea.PENDIENTE,
          fechaVencimiento: {
            lte: new Date(`${lastUpcomingDay}T00:00:00.000Z`),
          },
          registro: {
            archivadoEn: null,
            etapa: { not: 'DESCARTADO' },
            proyecto: { usuarioId: userId },
          },
        },
        orderBy: [{ fechaVencimiento: 'asc' }, { creadaEn: 'asc' }],
        select: {
          id: true,
          descripcion: true,
          tipo: true,
          fechaVencimiento: true,
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
      }),
      this.prisma.registroComercial.findMany({
        where: {
          ...activeProspectWhere,
          tareasSeguimiento: {
            none: { estado: EstadoTarea.PENDIENTE },
          },
        },
        orderBy: [{ nombreNegocio: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          nombreNegocio: true,
          nombreEncargado: true,
          etapa: true,
          nivelInteres: true,
        },
      }),
    ]);

    const grouped = {
      vencidas: [] as ReturnType<typeof this.taskResponse>[],
      hoy: [] as ReturnType<typeof this.taskResponse>[],
      proximosTresDias: [] as ReturnType<typeof this.taskResponse>[],
    };
    for (const task of tasks) {
      const response = this.taskResponse(task, today);
      const group = classifyTaskDate(response.fechaVencimiento, today);
      if (group === 'VENCIDA') grouped.vencidas.push(response);
      if (group === 'HOY') grouped.hoy.push(response);
      if (group === 'PROXIMOS_TRES_DIAS') {
        grouped.proximosTresDias.push(response);
      }
    }

    return {
      fechaHoy: today,
      indicadores: {
        prospectosActivos: activeProspects,
        prospectosInteresAlto: highInterestProspects,
        clientes: clients,
        tareasVencidas: grouped.vencidas.length,
      },
      ...grouped,
      prospectosSinProximaAccion: withoutTask,
    };
  }

  private taskResponse(
    task: {
      id: string;
      descripcion: string;
      tipo: string;
      fechaVencimiento: Date;
      registro: {
        id: string;
        nombreNegocio: string;
        nombreEncargado: string | null;
        etapa: string;
        nivelInteres: string;
      };
    },
    today: string,
  ) {
    const dueDate = calendarDateValue(task.fechaVencimiento);
    return {
      id: task.id,
      descripcion: task.descripcion,
      tipo: task.tipo,
      fechaVencimiento: dueDate,
      semaforo: calculateFollowUpStatus(dueDate, today),
      registro: task.registro,
    };
  }
}
