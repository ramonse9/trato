import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module.js';
import { RecordsController } from './records.controller.js';
import { RecordsService } from './records.service.js';

@Module({
  imports: [ProjectsModule],
  controllers: [RecordsController],
  providers: [RecordsService],
})
export class RecordsModule {}
