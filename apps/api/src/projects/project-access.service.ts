import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ProjectAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireProject(userId: string, projectId: string) {
    const project = await this.prisma.proyectoComercial.findFirst({
      where: { id: projectId, usuarioId: userId },
    });
    if (!project) throw this.notFound();
    return project;
  }

  async requireActiveProject(userId: string, projectId: string) {
    const project = await this.requireProject(userId, projectId);
    if (project.archivadoEn) {
      throw new ConflictException(
        'El proyecto está archivado. Restáuralo antes de modificarlo.',
      );
    }
    return project;
  }

  async requireRecord(userId: string, projectId: string, recordId: string) {
    const record = await this.prisma.registroComercial.findFirst({
      where: {
        id: recordId,
        proyectoId: projectId,
        proyecto: { usuarioId: userId },
      },
    });
    if (!record) throw this.notFound();
    return record;
  }

  async requireActiveRecord(
    userId: string,
    projectId: string,
    recordId: string,
  ) {
    await this.requireActiveProject(userId, projectId);
    const record = await this.requireRecord(userId, projectId, recordId);
    if (record.archivadoEn) {
      throw new ConflictException(
        'El registro está archivado. Restáuralo antes de modificarlo.',
      );
    }
    return record;
  }

  async requireActivity(
    userId: string,
    projectId: string,
    recordId: string,
    activityId: string,
  ) {
    const activity = await this.prisma.actividad.findFirst({
      where: {
        id: activityId,
        proyectoId: projectId,
        registroId: recordId,
        registro: { proyecto: { usuarioId: userId } },
      },
    });
    if (!activity) throw this.notFound();
    return activity;
  }

  async requireTask(
    userId: string,
    projectId: string,
    recordId: string,
    taskId: string,
  ) {
    const task = await this.prisma.tareaSeguimiento.findFirst({
      where: {
        id: taskId,
        proyectoId: projectId,
        registroId: recordId,
        registro: { proyecto: { usuarioId: userId } },
      },
    });
    if (!task) throw this.notFound();
    return task;
  }

  private notFound(): NotFoundException {
    return new NotFoundException('Recurso no encontrado.');
  }
}
