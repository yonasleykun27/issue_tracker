import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow requests from the Next.js frontend (BFF proxy)
  app.enableCors({ origin: 'http://localhost:3000' });

  // All routes are prefixed with /api to match Next.js proxy paths
  app.setGlobalPrefix('api');

  await app.listen(4000);
  console.log('NestJS backend running on http://localhost:4000/api');
}
bootstrap();

