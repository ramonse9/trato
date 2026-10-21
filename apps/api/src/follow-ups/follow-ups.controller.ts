import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/authenticated-request.js';
import { ListFollowUpsQueryDto } from './dto/list-follow-ups-query.dto.js';
import { FollowUpsService } from './follow-ups.service.js';

@Controller('projects/:projectId/follow-ups')
export class FollowUpsController {
  constructor(private readonly followUps: FollowUpsService) {}

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ListFollowUpsQueryDto,
  ) {
    return this.followUps.list(request.auth.user.id, projectId, query);
  }
}
