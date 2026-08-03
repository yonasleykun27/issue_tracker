import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow requests from the Next.js frontend (Vercel URL or local dev)
  // CORS_ORIGIN env var should be set to your Vercel URL in production
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  app.enableCors({ origin: corsOrigin });

  // All routes are prefixed with /api to match Next.js proxy paths
  app.setGlobalPrefix('api');

  // Railway assigns PORT dynamically — fallback to 4000 for local dev
  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`NestJS backend running on port ${port}`);
}
bootstrap();
