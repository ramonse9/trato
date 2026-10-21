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
import { ProjectInputDto } from './dto/project-input.dto.js';
import { ProjectsService } from './projects.service.js';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

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
}
