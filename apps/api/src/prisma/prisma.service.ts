import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnApplicationShutdown {
  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('La variable DATABASE_URL es obligatoria.');
    }

    super({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.$disconnect();
  }
}
