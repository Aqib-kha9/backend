import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banner } from './schemas/banner.schema';
import { User } from '../user/schemas/user.schema'; // Import User model
import { CreateBannerDto } from './dto/create-banner.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class BannerService {
  constructor(
    @InjectModel(Banner.name) private bannerModel: Model<Banner>,
    @InjectModel(User.name) private userModel: Model<User>, // Inject User model
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // Helper function to determine role from userid
  private determineRole(userid: string): string {
    if (userid.startsWith('u')) {
      return 'superadmin';
    } else if (userid.startsWith('a')) {
      return 'admin';
    } else if (userid.startsWith('r')) {
      return 'retailer';
    } else {
      return 'admin'; // default fallback
    }
  }

  async create(dto: CreateBannerDto, user: any) {
    console.log('User object in create:', user);
    
    const ownerId = user.userid;
    if (!ownerId) {
      throw new Error('User ID is required');
    }

    const ownerRole = this.determineRole(ownerId);

    console.log('Creating banner with:', { ownerId, ownerRole });

    const banner = new this.bannerModel({
      ...dto,
      ownerId: ownerId,
      ownerRole: ownerRole,
    });
    
    return await banner.save();
  }

  async findForUser(user: any, device: string) {
    const userId = user.userid;
    if (!userId) {
      return { url: null, topText: null };
    }

    const userRole = this.determineRole(userId);
    let banner: Banner | null = null;

    console.log(`Finding banner for user: ${userId}, role: ${userRole}, device: ${device}`);

    if (userRole === 'superadmin') {
      // Superadmin sees their own banners
      banner = await this.bannerModel.findOne({ ownerId: userId, device }).sort({ createdAt: -1 });
    } 
    else if (userRole === 'admin') {
      // Admin sees their own banners first, then superadmin banners as fallback
      banner = await this.bannerModel.findOne({ ownerId: userId, device }).sort({ createdAt: -1 });
      if (!banner) {
        banner = await this.bannerModel.findOne({ ownerRole: 'superadmin', device }).sort({ createdAt: -1 });
      }
    } 
    else if (userRole === 'retailer') {
      // For retailers, we need to get their adminid from the database
      let adminId = user.adminid;
      
      // If adminid is not in the token, fetch it from the database
      if (!adminId) {
        console.log(`Admin ID not found in token for retailer ${userId}, fetching from database...`);
        const retailerUser = await this.userModel.findOne({ userid: userId }).select('adminid');
        if (retailerUser && retailerUser.adminid) {
          adminId = retailerUser.adminid;
          console.log(`Found admin ID from database: ${adminId}`);
        } else {
          console.log(`Admin ID not found in database for retailer ${userId}`);
        }
      } else {
        console.log(`Retailer ${userId} belongs to admin: ${adminId}`);
      }
      
      // First priority: Admin's banners
      if (adminId) {
        banner = await this.bannerModel.findOne({ ownerId: adminId, device }).sort({ createdAt: -1 });
        console.log(`Admin banner found:`, banner ? 'Yes' : 'No');
      }
      
      // Second priority: Retailer's own banners (if they uploaded any)
      if (!banner) {
        banner = await this.bannerModel.findOne({ ownerId: userId, device }).sort({ createdAt: -1 });
        console.log(`Retailer's own banner found:`, banner ? 'Yes' : 'No');
      }
      
      // Final fallback: Superadmin banners
      if (!banner) {
        banner = await this.bannerModel.findOne({ ownerRole: 'superadmin', device }).sort({ createdAt: -1 });
        console.log(`Superadmin banner found:`, banner ? 'Yes' : 'No');
      }
    }

    console.log(`Final banner result:`, banner);
    return banner || { url: null, topText: null };
  }

  async findAllForUser(user: any) {
    const userId = user.userid;
    if (!userId) {
      return [];
    }

    const userRole = this.determineRole(userId);
    let query = {};
    
    console.log(`Finding all banners for user: ${userId}, role: ${userRole}`);
    
    if (userRole === 'superadmin') {
      query = { ownerId: userId };
    } else if (userRole === 'admin') {
      query = { 
        $or: [
          { ownerId: userId },
          { ownerRole: 'superadmin' }
        ]
      };
    } else if (userRole === 'retailer') {
      // For retailers, we need to get their adminid from the database
      let adminId = user.adminid;
      
      // If adminid is not in the token, fetch it from the database
      if (!adminId) {
        console.log(`Admin ID not found in token for retailer ${userId}, fetching from database...`);
        const retailerUser = await this.userModel.findOne({ userid: userId }).select('adminid');
        if (retailerUser && retailerUser.adminid) {
          adminId = retailerUser.adminid;
          console.log(`Found admin ID from database: ${adminId}`);
        } else {
          console.log(`Admin ID not found in database for retailer ${userId}`);
        }
      } else {
        console.log(`Retailer ${userId} belongs to admin: ${adminId}`);
      }

      query = { 
        $or: [
          { ownerId: adminId },  // Admin's banners (highest priority)
          { ownerId: userId },   // Retailer's own banners
          { ownerRole: 'superadmin' } // Superadmin banners
        ]
      };
    }

    console.log(`Query for banners:`, query);
    return await this.bannerModel.find(query).sort({ createdAt: -1 });
  }

  async deleteBanner(id: string, user: any) {
    const userId = user.userid;
    if (!userId) {
      throw new Error('User ID is required');
    }

    const userRole = this.determineRole(userId);
    const banner = await this.bannerModel.findById(id);
    
    if (!banner) {
      throw new Error('Banner not found');
    }

    // Check ownership - superadmin can delete any, others can only delete their own
    if (userRole !== 'superadmin' && banner.ownerId !== userId) {
      throw new ForbiddenException('You can only delete your own banners');
    }

    // Delete from Cloudinary if public ID exists
    if (banner.cloudinaryPublicId) {
      await this.cloudinaryService.deleteImage(banner.cloudinaryPublicId);
    }

    // Delete from database
    await this.bannerModel.findByIdAndDelete(id);
    return { success: true };
  }
}