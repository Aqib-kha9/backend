import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Wallpaper, WallpaperSchema } from './schemas/wallpaper.schema';
import { WallpaperService } from './wallpaper.service';
import { WallpaperController } from './wallpaper.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { User, UserSchema } from '../user/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wallpaper.name, schema: WallpaperSchema },
      { name: User.name, schema: UserSchema }
    ]),
    CloudinaryModule,
  ],
  controllers: [WallpaperController],
  providers: [WallpaperService],
  exports: [WallpaperService],
})
export class WallpaperModule {}