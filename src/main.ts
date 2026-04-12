import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  app.enableCors({
    origin: [
      'http://localhost:3000', 
      'http://localhost:3001',
      'https://adminretialers.vercel.app',
      'https://superfrontend-ruddy.vercel.app',
      'https://superfrontend-six.vercel.app',
      'https://admin-retialer.vercel.app',
      'https://dhanasriakhiltilesadmin.vercel.app',
      'https://superfrontend-blond.vercel.app',
    ],  
    // Next.js port
  });

  // Serve uploads folder publicly
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,    // strips unknown fields
    forbidNonWhitelisted: true, // throws error if unknown field sent
    transform: true,    // transforms payloads to DTO types
  }));

  // Increase the body size limit (e.g., to 100mb for large Tally syncs)
  app.use(bodyParser.json({ limit: '100mb' }));
  app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

  // Fallback error handler for body parsing errors
  app.use((err, req, res, next) => {
    if (err && err.status === 413) {
      console.error('Payload Too Large Error:', err.message);
      return res.status(413).json({ message: 'Payload Too Large' });
    }
    next();
  });

  await app.listen(4000); // NestJS backend port
}
bootstrap();
