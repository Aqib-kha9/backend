import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  Req, 
  UseGuards, 
  UseInterceptors, 
  UploadedFile, 
  Delete, 
  Param,
  Logger 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WallpaperService } from './wallpaper.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateWallpaperDto } from './dto/create-wallpaper.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin/wallpaper')
export class WallpaperController {
  private readonly logger = new Logger(WallpaperController.name);

  constructor(
    private readonly wallpaperService: WallpaperService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload-wallpaper')
  @UseInterceptors(FileInterceptor('file'))
  async uploadWallpaper(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Req() req,
  ) {
    try {
      this.logger.log('Starting wallpaper upload process...');
      this.logger.log('User object:', req.user);

      // Ensure user object has required fields
      if (!req.user.role && req.user.userid) {
        if (req.user.userid.startsWith('u')) {
          req.user.role = 'superadmin';
        } else if (req.user.userid.startsWith('a')) {
          req.user.role = 'admin';
        } else if (req.user.userid.startsWith('r')) {
          req.user.role = 'retailer';
        }
      }
      
      let cloudinaryResult: any;
      let imageUrl = body.url;

      // If file is uploaded, upload to Cloudinary
      if (file) {
        this.logger.log('Uploading file to Cloudinary...');
        cloudinaryResult = await this.cloudinaryService.uploadImage(file, 'wallpapers');
        imageUrl = cloudinaryResult.secure_url;
        this.logger.log(`File uploaded successfully: ${imageUrl}`);
      } 
      // If URL is provided, upload that URL to Cloudinary
      else if (body.url) {
        this.logger.log(`Uploading URL to Cloudinary: ${body.url}`);
        cloudinaryResult = await this.cloudinaryService.uploadImageFromUrl(body.url, 'wallpapers');
        imageUrl = cloudinaryResult.secure_url;
        this.logger.log(`URL uploaded successfully: ${imageUrl}`);
      } else {
        throw new Error('Either file or URL is required');
      }

      const dto: CreateWallpaperDto = {
        device: body.device,
        url: imageUrl,
        cloudinaryPublicId: cloudinaryResult?.public_id || null,
      };

      this.logger.log('Creating wallpaper in database...');
      
      const wallpaper = await this.wallpaperService.create(dto, req.user);
      
      this.logger.log('Wallpaper created successfully');
      
      return { 
        success: true, 
        wallpaper,
        message: 'Wallpaper uploaded successfully' 
      };
    } catch (error) {
      this.logger.error('Wallpaper upload error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to upload wallpaper' 
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getWallpaper(@Query('device') device: string, @Req() req) {
    try {
      // Ensure user object has role
      if (!req.user.role && req.user.userid) {
        if (req.user.userid.startsWith('u')) {
          req.user.role = 'superadmin';
        } else if (req.user.userid.startsWith('a')) {
          req.user.role = 'admin';
        } else if (req.user.userid.startsWith('r')) {
          req.user.role = 'retailer';
        }
      }

      this.logger.log(`Getting wallpaper for device: ${device}, user:`, req.user);
      const wallpaper = await this.wallpaperService.findForUser(req.user, device);
      return wallpaper;
    } catch (error) {
      this.logger.error('Get wallpaper error:', error);
      return { url: null };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('all')
  async getAllWallpapers(@Req() req) {
    try {
      // Ensure user object has role
      if (!req.user.role && req.user.userid) {
        if (req.user.userid.startsWith('u')) {
          req.user.role = 'superadmin';
        } else if (req.user.userid.startsWith('a')) {
          req.user.role = 'admin';
        } else if (req.user.userid.startsWith('r')) {
          req.user.role = 'retailer';
        }
      }

      this.logger.log('Getting all wallpapers for user:', req.user);
      const wallpapers = await this.wallpaperService.findAllForUser(req.user);
      return wallpapers;
    } catch (error) {
      this.logger.error('Get all wallpapers error:', error);
      return [];
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteWallpaper(@Param('id') id: string, @Req() req) {
    try {
      // Ensure user object has role
      if (!req.user.role && req.user.userid) {
        if (req.user.userid.startsWith('u')) {
          req.user.role = 'superadmin';
        } else if (req.user.userid.startsWith('a')) {
          req.user.role = 'admin';
        } else if (req.user.userid.startsWith('r')) {
          req.user.role = 'retailer';
        }
      }

      this.logger.log(`Deleting wallpaper: ${id} for user:`, req.user);
      await this.wallpaperService.deleteWallpaper(id, req.user);
      return { 
        success: true, 
        message: 'Wallpaper deleted successfully' 
      };
    } catch (error) {
      this.logger.error('Delete wallpaper error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to delete wallpaper' 
      };
    }
  }
}