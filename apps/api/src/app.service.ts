import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

export interface HealthResponse {
  status: 'ok';
  database: 'up';
  timestamp: string;
  timezone: 'America/Mazatlan';
}

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        database: 'up',
        timestamp: new Date().toISOString(),
        timezone: 'America/Mazatlan',
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
        message: 'No fue posible conectar con PostgreSQL.',
      });
    }
  }
}
