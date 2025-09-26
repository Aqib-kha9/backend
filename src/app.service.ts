// app.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  onModuleInit() {
    this.logger.log('AppService initialized');
    this.connection.on('connected', () => {
      this.logger.log('✅ MongoDB connected!');
    });

    this.connection.on('error', (err) => {
      this.logger.error('❌ MongoDB connection error:', err);
    });

    this.connection.on('disconnected', () => {
      this.logger.warn('⚠️ MongoDB disconnected!');
    });
  }
}