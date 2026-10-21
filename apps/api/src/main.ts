import { NestFactory } from '@nestjs/core';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

loadEnv({ path: resolve(process.cwd(), '../../.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.API_PORT ?? 3000;

  configureApp(app);
  app.enableShutdownHooks();

  await app.listen(port);
}
await bootstrap();
