import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module.js';
import { TodayController } from './today.controller.js';
import { TodayService } from './today.service.js';

@Module({
  imports: [ProjectsModule],
  controllers: [TodayController],
  providers: [TodayService],
})
export class TodayModule {}
