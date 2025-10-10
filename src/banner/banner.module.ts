import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Banner, BannerSchema } from './schemas/banner.schema';
import { BannerService } from './banner.service';
import { BannerController } from './banner.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { User, UserSchema } from '../user/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Banner.name, schema: BannerSchema },
      { name: User.name, schema: UserSchema } // Add User model
    ]),
    CloudinaryModule,
  ],
  controllers: [BannerController],
  providers: [BannerService],
})
export class BannerModule {}