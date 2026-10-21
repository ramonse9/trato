import {
  Controller,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
  Patch,
  Body,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/authenticated-request.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateRecordDto } from './dto/update-record.dto.js';
import { ProjectInputDto } from './dto/project-input.dto.js';
import { ProjectAccessService } from './project-access.service.js';
import { ProjectsService } from './projects.service.js';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly projects: ProjectsService,
  ) {}

  @Get()
  listProjects(@Req() request: AuthenticatedRequest) {
    return this.projects.list(request.auth.user.id, false);
  }

  @Get('archived')
  listArchivedProjects(@Req() request: AuthenticatedRequest) {
    return this.projects.list(request.auth.user.id, true);
  }

  @Post()
  createProject(
    @Req() request: AuthenticatedRequest,
    @Body() dto: ProjectInputDto,
  ) {
    return this.projects.create(request.auth.user.id, dto);
  }

  @Get(':projectId')
  getProject(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projects.get(request.auth.user.id, projectId);
  }

  @Patch(':projectId')
  updateProject(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: ProjectInputDto,
  ) {
    return this.projects.update(request.auth.user.id, projectId, dto);
  }

  @Post(':projectId/archive')
  archiveProject(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projects.archive(request.auth.user.id, projectId);
  }

  @Post(':projectId/restore')
  restoreProject(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projects.restore(request.auth.user.id, projectId);
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
    await this.access.requireActiveProject(request.auth.user.id, projectId);
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
