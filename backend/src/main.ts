import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow requests from the Next.js frontend (Vercel URL or local dev)
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  app.enableCors({ origin: corsOrigin });

  // All routes are prefixed with /api to match Next.js proxy paths
  app.setGlobalPrefix('api');

  // Swagger API documentation (available at /api/docs)
  const config = new DocumentBuilder()
    .setTitle('Ethio Telecom Issue Tracker API')
    .setDescription('REST API documentation for the Issue Tracker backend')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-user-id', in: 'header' }, 'x-user-id')
    .addApiKey({ type: 'apiKey', name: 'x-user-role', in: 'header' }, 'x-user-role')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Railway assigns PORT dynamically — fallback to 4000 for local dev
  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`NestJS backend running on port ${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
