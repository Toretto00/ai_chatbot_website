import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

export default async function handler(req: any, res: any) {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );

  app.setGlobalPrefix('api/v1', { exclude: ['/'] });

  app.enableCors({
    origin: ['http://localhost:3000', 'https://ai-chatbot-website-two.vercel.app/'], // Add your production frontend URL here
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  await app.init();

  const instance = app.getHttpAdapter().getInstance();
  return instance(req, res);
}
