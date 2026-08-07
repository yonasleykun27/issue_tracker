import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Express } from 'express';

let cachedServer: Express;

async function bootstrapServer(): Promise<Express> {
  if (!cachedServer) {
    const app = await NestFactory.create(AppModule);
    
    // Enable CORS for Vercel frontend or local dev
    const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
    app.enableCors({ origin: corsOrigin });

    // Set global prefix 'api' to match standard routes
    app.setGlobalPrefix('api');

    // Swagger API documentation for Vercel deployment
    const config = new DocumentBuilder()
      .setTitle('Ethio Telecom Issue Tracker API')
      .setDescription('REST API documentation for the Issue Tracker backend')
      .setVersion('1.0')
      .addApiKey({ type: 'apiKey', name: 'x-user-id', in: 'header' }, 'x-user-id')
      .addApiKey({ type: 'apiKey', name: 'x-user-role', in: 'header' }, 'x-user-role')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    const swaggerOptions = {
      customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css',
      customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.js',
      ],
    };
    SwaggerModule.setup('api/docs', app, document, swaggerOptions);
    SwaggerModule.setup('docs', app, document, swaggerOptions);

    await app.init();
    cachedServer = app.getHttpAdapter().getInstance();
  }
  return cachedServer;
}

export default async (req: any, res: any) => {
  const server = await bootstrapServer();
  return server(req, res);
};
