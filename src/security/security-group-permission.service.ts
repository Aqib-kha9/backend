import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SecurityGroupPermission,
} from './schemas/security-group-permission.schema';

@Injectable()
export class SecurityGroupPermissionService {
  constructor(
    @InjectModel(SecurityGroupPermission.name)
    private readonly groupPermissionModel: Model<SecurityGroupPermission>,
  ) {}

  async create(data: Partial<SecurityGroupPermission>): Promise<SecurityGroupPermission> {
    const created = new this.groupPermissionModel(data);
    return created.save();
  }

  async findAll(): Promise<SecurityGroupPermission[]> {
    return this.groupPermissionModel.find().exec();
  }

  async findById(id: string): Promise<SecurityGroupPermission | null> {
    return this.groupPermissionModel.findById(id).exec();
  }

  async update(id: string, data: Partial<SecurityGroupPermission>): Promise<SecurityGroupPermission | null> {
    return this.groupPermissionModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<SecurityGroupPermission | null> {
    return this.groupPermissionModel.findByIdAndDelete(id).exec();
  }
}
