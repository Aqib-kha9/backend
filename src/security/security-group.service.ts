import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SecurityGroup } from './schemas/security-group.schema';

@Injectable()
export class SecurityGroupService {
  
  constructor(@InjectModel(SecurityGroup.name) private groupModel: Model<SecurityGroup>) {}

  async findAll(): Promise<SecurityGroup[]> {
    return this.groupModel.find().exec();
  }
  async getRoleByGroupId(groupid: number): Promise<SecurityGroup | null> {
    return this.groupModel.findOne({ groupid }).exec();
  }
  async create(data: Partial<SecurityGroup>): Promise<SecurityGroup> {
    const newGroup = new this.groupModel(data);
    return newGroup.save();
  }
}
