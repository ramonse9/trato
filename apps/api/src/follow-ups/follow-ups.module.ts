import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module.js';
import { FollowUpsController } from './follow-ups.controller.js';
import { FollowUpsService } from './follow-ups.service.js';

@Module({
  imports: [ProjectsModule],
  controllers: [FollowUpsController],
  providers: [FollowUpsService],
})
export class FollowUpsModule {}
