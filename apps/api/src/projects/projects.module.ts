import { Module } from '@nestjs/common';
import { ProjectAccessService } from './project-access.service.js';
import { ProjectsController } from './projects.controller.js';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectAccessService],
})
export class ProjectsModule {}
