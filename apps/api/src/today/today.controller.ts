import { Controller, Get, Param, ParseUUIDPipe, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../common/authenticated-request.js';
import { TodayService } from './today.service.js';

@Controller('projects/:projectId/today')
export class TodayController {
  constructor(private readonly today: TodayService) {}

  @Get()
  get(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.today.get(request.auth.user.id, projectId);
  }
}
