import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
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

    await app.init();
    cachedServer = app.getHttpAdapter().getInstance();
  }
  return cachedServer;
}

export default async (req: any, res: any) => {
  const server = await bootstrapServer();
  return server(req, res);
};
