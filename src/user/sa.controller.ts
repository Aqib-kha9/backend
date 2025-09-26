import { Controller, Get, Post, Body, UseGuards, Put } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminService } from './sa.service';

@Controller('/superadmin')export class SAController {
    constructor(private readonly SuperAdminService: SuperAdminService,
      @InjectModel(User.name) private userModel: Model<User>,
    ) {}

  @Get('/admins')
  async getAllAdmins(): Promise<User[]> {
    return this.userModel
    .find({ userid: { $regex: /^a\d+$/ } })
    .select('userid name email phonenumber city status') // only include these
    .exec();

  }

  @Get('/analytics')
  async getAnalytics(): Promise<any> {
    return this.SuperAdminService.getAnalytics();
  }

  @Put('toggle-admin-status')
  @UseGuards(AuthGuard('jwt'))
  async toggleAdminStatus(@Body() body: { userid: string; superAdminId: string; newStatus: string }) {
    return this.SuperAdminService.toggleAdminStatus(body.userid, body.superAdminId, body.newStatus);
   }
  
   
  @Put('Subscription')
  @UseGuards(AuthGuard('jwt'))
  async subscription(@Body() body: { userid: string; days: number; action: 'StartNew' | 'HandleDays'; handleDaysType?: 'increase' | 'decrease'; superAdminId: string }) {
    return this.SuperAdminService.updateAdminSubscription(body.userid, body.days, body.action, body.superAdminId, body.handleDaysType);
  }



 










}