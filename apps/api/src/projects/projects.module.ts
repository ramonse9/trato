import { Module } from '@nestjs/common';
import { ProjectAccessService } from './project-access.service.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectAccessService, ProjectsService],
})
export class ProjectsModule {}
