import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserSecurityGroup } from './schemas/user-security-group.schema';

@Injectable()
export class UserSecurityGroupService {
  constructor(
    @InjectModel(UserSecurityGroup.name)
    private readonly userSecurityGroupModel: Model<UserSecurityGroup>,
  ) {}

  /**
   * Find a user entry in the userSecurityGroup collection by email.
   * This is used during registration to check if a user is pre-approved.
   */
  async findByEmail(email: string): Promise<UserSecurityGroup | null> {
    return this.userSecurityGroupModel.findOne({ email }).exec();
  }

  async findByUserid(userid: string): Promise<UserSecurityGroup | null> {
    return this.userSecurityGroupModel.findOne({ userid }).exec();
  }

  /**
   * Optional: Add a new pre-approved user to the group
   */
  
  /**
   * Optional: Get all pre-approved users (for admin panel, etc.)
   */
  async findAll(): Promise<UserSecurityGroup[]> {
    return this.userSecurityGroupModel.find().exec();
  }
}
