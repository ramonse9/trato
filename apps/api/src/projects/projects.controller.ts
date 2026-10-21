import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Body,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/authenticated-request.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateRecordDto } from './dto/update-record.dto.js';
import { ProjectAccessService } from './project-access.service.js';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  @Get()
  listProjects(@Req() request: AuthenticatedRequest) {
    return this.prisma.proyectoComercial.findMany({
      where: { usuarioId: request.auth.user.id },
      orderBy: { nombre: 'asc' },
    });
  }

  @Get(':projectId/records')
  async listRecords(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    await this.access.requireProject(request.auth.user.id, projectId);
    return this.prisma.registroComercial.findMany({
      where: {
        proyectoId: projectId,
        proyecto: { usuarioId: request.auth.user.id },
      },
      orderBy: { nombreNegocio: 'asc' },
    });
  }

  @Get(':projectId/records/:recordId')
  getRecord(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ) {
    return this.access.requireRecord(request.auth.user.id, projectId, recordId);
  }

  @Patch(':projectId/records/:recordId')
  async updateRecord(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() dto: UpdateRecordDto,
  ) {
    await this.access.requireRecord(request.auth.user.id, projectId, recordId);
    return this.prisma.registroComercial.update({
      where: { id_proyectoId: { id: recordId, proyectoId: projectId } },
      data: { nombreNegocio: dto.nombreNegocio.trim() },
    });
  }

  @Get(':projectId/records/:recordId/activities/:activityId')
  getActivity(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
  ) {
    return this.access.requireActivity(
      request.auth.user.id,
      projectId,
      recordId,
      activityId,
    );
  }

  @Get(':projectId/records/:recordId/tasks/:taskId')
  getTask(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.access.requireTask(
      request.auth.user.id,
      projectId,
      recordId,
      taskId,
    );
  }
}
