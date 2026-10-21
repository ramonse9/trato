import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, minutes } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { AuthThrottlerGuard } from './auth/auth-throttler.guard.js';
import { CsrfGuard } from './auth/csrf.guard.js';
import { SessionGuard } from './auth/session.guard.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { RecordsModule } from './records/records.module.js';
import { TodayModule } from './today/today.module.js';

@Module({
  imports: [
    PrismaModule,
    ThrottlerModule.forRoot([{ name: 'default', ttl: minutes(1), limit: 100 }]),
    AuthModule,
    ProjectsModule,
    RecordsModule,
    TodayModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule {}
