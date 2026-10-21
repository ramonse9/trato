import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectInputDto } from './dto/project-input.dto.js';
import { ProjectAccessService } from './project-access.service.js';

const projectSelect = {
  id: true,
  nombre: true,
  descripcion: true,
  archivadoEn: true,
  creadoEn: true,
  actualizadoEn: true,
  _count: { select: { registros: true } },
} as const;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  list(userId: string, archived: boolean) {
    return this.prisma.proyectoComercial.findMany({
      where: {
        usuarioId: userId,
        archivadoEn: archived ? { not: null } : null,
      },
      select: projectSelect,
      orderBy: archived
        ? [{ archivadoEn: 'desc' }, { nombre: 'asc' }]
        : { nombre: 'asc' },
    });
  }

  async get(userId: string, projectId: string) {
    await this.access.requireProject(userId, projectId);
    return this.prisma.proyectoComercial.findUniqueOrThrow({
      where: { id: projectId },
      select: projectSelect,
    });
  }

  async create(userId: string, dto: ProjectInputDto) {
    try {
      return await this.prisma.proyectoComercial.create({
        data: {
          usuarioId: userId,
          nombre: dto.nombre,
          descripcion: this.description(dto.descripcion),
        },
        select: projectSelect,
      });
    } catch (error) {
      this.rethrowUniqueName(error);
      throw error;
    }
  }

  async update(userId: string, projectId: string, dto: ProjectInputDto) {
    await this.access.requireActiveProject(userId, projectId);
    try {
      return await this.prisma.proyectoComercial.update({
        where: { id: projectId },
        data: {
          nombre: dto.nombre,
          descripcion: this.description(dto.descripcion),
        },
        select: projectSelect,
      });
    } catch (error) {
      this.rethrowUniqueName(error);
      throw error;
    }
  }

  async archive(userId: string, projectId: string) {
    await this.access.requireActiveProject(userId, projectId);
    return this.prisma.proyectoComercial.update({
      where: { id: projectId },
      data: { archivadoEn: new Date() },
      select: projectSelect,
    });
  }

  async restore(userId: string, projectId: string) {
    const project = await this.access.requireProject(userId, projectId);
    if (!project.archivadoEn) return this.get(userId, projectId);

    return this.prisma.proyectoComercial.update({
      where: { id: projectId },
      data: { archivadoEn: null },
      select: projectSelect,
    });
  }

  private description(value: string | null | undefined): string | null {
    return value ? value : null;
  }

  private rethrowUniqueName(error: unknown): void {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Ya existe un proyecto con ese nombre.');
    }
  }
}
