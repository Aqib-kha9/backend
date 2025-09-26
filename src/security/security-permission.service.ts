import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SecurityPermission,
} from './schemas/security-permission.schema';

@Injectable()
export class SecurityPermissionService {
  constructor(
    @InjectModel(SecurityPermission.name)
    private readonly securityPermissionModel: Model<SecurityPermission>,
  ) {}

  async create(data: Partial<SecurityPermission>): Promise<SecurityPermission> {
    const created = new this.securityPermissionModel(data);
    return created.save();
  }

  async findAll(): Promise<SecurityPermission[]> {
    return this.securityPermissionModel.find().exec();
  }

  async findById(id: string): Promise<SecurityPermission | null> {
    return this.securityPermissionModel.findById(id).exec();
  }

  async update(id: string, data: Partial<SecurityPermission>): Promise<SecurityPermission | null> {
    return this.securityPermissionModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<SecurityPermission | null> {
    return this.securityPermissionModel.findByIdAndDelete(id).exec();
  }
}
