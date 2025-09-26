import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { ProductModule } from './product/product.module';
import { SecurityModule } from './security/security-group.module';
import { AuthModule } from './auth/auth.module';
import { InvoiceController } from './invoice/invoice.controller';
import Customer from './invoice/schemas/customer.schema';
import { ScheduleModule } from '@nestjs/schedule';
import { SubscriptionTasksService } from './subscriptiontasks/subscription-tasks.service';


@Module({
  imports: [MongooseModule.forRoot('mongodb://localhost:27017/inventory'),
    MongooseModule.forFeature([{ name: 'Customer', schema: (Customer as any).schema }]),
    UserModule,ProductModule,
    SecurityModule,AuthModule,
    ScheduleModule.forRoot()],
  controllers: [InvoiceController],
  providers: [AppService, SubscriptionTasksService],
})
export class AppModule {}
