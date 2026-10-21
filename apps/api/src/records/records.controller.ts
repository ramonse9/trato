import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/authenticated-request.js';
import { CreateRecordDto } from './dto/create-record.dto.js';
import { ListRecordsQueryDto } from './dto/list-records-query.dto.js';
import { UpdateRecordDto } from './dto/update-record.dto.js';
import {
  CompleteTaskDto,
  CreateActivityDto,
  CreateTaskDto,
  UpdateTaskDto,
} from './dto/follow-up.dto.js';
import { RecordsService } from './records.service.js';

@Controller('projects/:projectId/records')
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ListRecordsQueryDto,
  ) {
    return this.records.list(request.auth.user.id, projectId, query);
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateRecordDto,
  ) {
    return this.records.create(request.auth.user.id, projectId, dto);
  }

  @Get(':recordId')
  get(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ) {
    return this.records.get(request.auth.user.id, projectId, recordId);
  }

  @Patch(':recordId')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() dto: UpdateRecordDto,
  ) {
    return this.records.update(request.auth.user.id, projectId, recordId, dto);
  }

  @Post(':recordId/archive')
  archive(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ) {
    return this.records.archive(request.auth.user.id, projectId, recordId);
  }

  @Post(':recordId/restore')
  restore(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ) {
    return this.records.restore(request.auth.user.id, projectId, recordId);
  }

  @Get(':recordId/activities/:activityId')
  getActivity(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
  ) {
    return this.records.getActivity(
      request.auth.user.id,
      projectId,
      recordId,
      activityId,
    );
  }

  @Post(':recordId/activities')
  createActivity(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() dto: CreateActivityDto,
  ) {
    return this.records.createActivity(
      request.auth.user.id,
      projectId,
      recordId,
      dto,
    );
  }

  @Get(':recordId/tasks/:taskId')
  getTask(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.records.getTask(
      request.auth.user.id,
      projectId,
      recordId,
      taskId,
    );
  }

  @Post(':recordId/tasks')
  createTask(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.records.createTask(
      request.auth.user.id,
      projectId,
      recordId,
      dto,
    );
  }

  @Patch(':recordId/tasks/:taskId')
  updateTask(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.records.updateTask(
      request.auth.user.id,
      projectId,
      recordId,
      taskId,
      dto,
    );
  }

  @Post(':recordId/tasks/:taskId/complete')
  completeTask(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CompleteTaskDto,
  ) {
    return this.records.completeTask(
      request.auth.user.id,
      projectId,
      recordId,
      taskId,
      dto,
    );
  }
}
