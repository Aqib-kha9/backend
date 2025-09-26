import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: [
      'http://localhost:3000', 
      'http://localhost:3001'
            ],  
    // Next.js port
  });

  // Serve uploads folder publicly
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,    // strips unknown fields
    forbidNonWhitelisted: true, // throws error if unknown field sent
    transform: true,    // transforms payloads to DTO types
  }));

  // Increase the body size limit (e.g., to 5mb)
  app.use(bodyParser.json({ limit: '2mb' }));
  app.use(bodyParser.urlencoded({ limit: '2mb', extended: true }));

  await app.listen(4000); // NestJS backend port
}
bootstrap();
