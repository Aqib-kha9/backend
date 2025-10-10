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
import { BannerService } from './banner.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('banner')
export class BannerController {
  private readonly logger = new Logger(BannerController.name);

  constructor(
    private readonly bannerService: BannerService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadBanner(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Req() req,
  ) {
    try {
      this.logger.log('Starting banner upload process...');
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
        cloudinaryResult = await this.cloudinaryService.uploadImage(file, 'banners');
        imageUrl = cloudinaryResult.secure_url;
        this.logger.log(`File uploaded successfully: ${imageUrl}`);
      } 
      // If URL is provided, upload that URL to Cloudinary
      else if (body.url) {
        this.logger.log(`Uploading URL to Cloudinary: ${body.url}`);
        cloudinaryResult = await this.cloudinaryService.uploadImageFromUrl(body.url, 'banners');
        imageUrl = cloudinaryResult.secure_url;
        this.logger.log(`URL uploaded successfully: ${imageUrl}`);
      } else {
        throw new Error('Either file or URL is required');
      }

      const dto: CreateBannerDto = {
        device: body.device,
        url: imageUrl,
        topText: body.topText || '',
        cloudinaryPublicId: cloudinaryResult?.public_id || null,
      };

      this.logger.log('Creating banner in database...');
      
      const banner = await this.bannerService.create(dto, req.user);
      
      this.logger.log('Banner created successfully');
      
      return { 
        success: true, 
        banner,
        message: 'Banner uploaded successfully' 
      };
    } catch (error) {
      this.logger.error('Banner upload error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to upload banner' 
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getBanner(@Query('device') device: string, @Req() req) {
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

      this.logger.log(`Getting banner for device: ${device}, user:`, req.user);
      const banner = await this.bannerService.findForUser(req.user, device);
      return banner;
    } catch (error) {
      this.logger.error('Get banner error:', error);
      return { url: null, topText: null };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('all')
  async getAllBanners(@Req() req) {
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

      this.logger.log('Getting all banners for user:', req.user);
      const banners = await this.bannerService.findAllForUser(req.user);
      return banners;
    } catch (error) {
      this.logger.error('Get all banners error:', error);
      return [];
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteBanner(@Param('id') id: string, @Req() req) {
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

      this.logger.log(`Deleting banner: ${id} for user:`, req.user);
      await this.bannerService.deleteBanner(id, req.user);
      return { 
        success: true, 
        message: 'Banner deleted successfully' 
      };
    } catch (error) {
      this.logger.error('Delete banner error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to delete banner' 
      };
    }
  }
}