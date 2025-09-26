import { Injectable, Logger, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { Product } from 'src/product/schemas/product.schema';
import { Party } from './schemas/party.schema';
import { UserService } from './user.service';

@Injectable()
export class SuperAdminService {
    private readonly logger = new Logger(SuperAdminService.name);
    constructor(@InjectModel(User.name) private userModel: Model<User>,
                @InjectModel(Product.name) private productModel: Model<Product>, 
                private readonly UserService: UserService)
    {}


async createPreApprovedAdmin(data: {
    email: string;
    id: string;
    subscription : number;
  }): Promise<User> {
    // Step 1: Find the latest admin with highest userid like "a101", "a102", etc.
    const latestUser = await this.userModel
      .find({ userid: { $regex: /^a\d+$/ } })
      .sort({ userid: -1 })
      .limit(1)
      .exec();
  
    let nextIdNumber = 101;
    if (latestUser.length > 0) {
      const lastId = parseInt(latestUser[0].userid.slice(1));
      if (!isNaN(lastId)) {
        nextIdNumber = lastId + 1;
      }
    }
    const user = await this.userModel.findById(data.id); // MongoDB _id
    if (!user) throw new NotFoundException('User not found');
    const adminid = user.userid;
  
    const userid = `a${nextIdNumber}`;
  
    // Step 2: Create new user with the generated userid
    const newEntry = new this.userModel({
      email: data.email,
      created_stamp: new Date(),
      subscription_update: new Date(),
      userid: userid,
      adminid : adminid,
      status : 'preapproved',
      subscription : data.subscription,
    });
  
    return newEntry.save();

}

    async toggleAdminStatus(adminUserId: string, superAdminId: string, newStatus: string): Promise<{ message: string }> {
        // Validate superadmin
        
        const superAdmin = await this.userModel.findById(superAdminId );
        if (!superAdmin || !superAdmin.userid.startsWith('u')) {
          throw new UnauthorizedException('Only superadmins can toggle admin status');
        }
        
        // Find the admin to update
        const admin = await this.userModel.findOne({ userid: adminUserId });
        if (!admin) {
          throw new NotFoundException('Admin not found');
        }
      
        // Optional: prevent superadmins from modifying themselves
        if (adminUserId === superAdminId) {
          throw new BadRequestException('You cannot modify your own status');
        }
      
        // Update status
        if (newStatus === 'active' && !admin.phonenumber) {
          admin.status = 'preapproved';
          newStatus = 'preapproved';
        }else{
          admin.status = newStatus;
        }
        await admin.save();
      
        return { message: `Status updated to ${newStatus}` };
      }

  async getAnalytics(): Promise<any> {
    const admins = await this.userModel.find({ userid: { $regex: /^a/ } }).select('name city state zip lastlogin userid created_stamp status subscription subscription_update');
    const retailers = await this.userModel.countDocuments({ userid: { $regex: /^r/ } });
    const products = await this.productModel.countDocuments();
    
    const activeAdminsCount = await this.userModel.countDocuments({
      userid: { $regex: /^a/ },
      status: 'active',
    });

    // Calculate retailers and products per admin
    const adminReport = await Promise.all(admins.map(async (admin) => {
      // console.log("adminReport")
      const retailersUnderAdmin = await this.userModel.countDocuments({
        userid: { $regex: /^r/ },
        adminid: admin.userid
      });

      const party = await this.UserService.findpartybyuserid(admin.userid)

      

      const productsUnderAdmin = await this.productModel.countDocuments({
        party_id: party.party_id
      });

      return {
        adminId: admin.userid,
        name: admin.name,
        lastlogin: admin.lastlogin,
        city:admin.city,
        state:admin.state,
        zip:admin.zip,
        created :admin.created_stamp,
        status:admin.status,
        subscription:admin.subscription,
        subscribed_at: admin.subscription_update,
        retailersCount: retailersUnderAdmin,
        productsCount: productsUnderAdmin,
        partyid :party.party_id,
        store: party.store_name,
      };
    }));

    const response = {
      adminReport,
      Stats: {
        totalAdmins: admins.length,
        totalRetailers: retailers,
        totalProducts: products,
        activeAdmins: activeAdminsCount,
      },
    };
    // console.log(response)
    return response;

    
  }

  async updateAdminSubscription(
    userid: string,
    days: number,
    action: 'StartNew' | 'HandleDays',
    superAdminId: string,
    handleDaysType?: 'increase' | 'decrease'
  ): Promise<{ message: string; newSubscription: number }> {
    // Validate superadmin
    const superAdmin = await this.userModel.findById(superAdminId);
    if (!superAdmin || !superAdmin.userid.startsWith('u')) {
      throw new UnauthorizedException('Only superadmins can update subscription');
    }
    // Find the admin to update
    const admin = await this.userModel.findOne({ userid });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }
    // Optional: prevent superadmins from modifying themselves
    if (userid === superAdminId) {
      throw new BadRequestException('You cannot modify your own subscription');
    }
    // Update subscription logic
    if (action === 'StartNew') {
      admin.subscription = days;
      admin.subscription_update = new Date();
    } else if (action === 'HandleDays') {
      if (handleDaysType === 'increase') {
        admin.subscription = (admin.subscription || 0) + days;
      } else if (handleDaysType === 'decrease') {
        admin.subscription = Math.max(0, (admin.subscription || 0) - days);
      }
      // Do not update subscription_update date for HandleDays
    }
    await admin.save();
    return { message: `Subscription updated`, newSubscription: admin.subscription };
  }





  }
    