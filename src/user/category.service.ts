import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>
  ) {}

  async saveUserCategories(adminUserid: string, categories: { name: string, productIds: string[] }[]) {
    // Remove old categories for this admin
    await this.categoryModel.deleteMany({ adminUserid });
    // Insert new categories
    const docs = categories.map(cat => ({ adminUserid, name: cat.name, productIds: cat.productIds }));
    return this.categoryModel.insertMany(docs);
  }

  async getUserCategories(adminUserid: string) {
    // console.log(adminUserid);
    // console.log(this.categoryModel.find({ adminUserid }).lean());
    return this.categoryModel.find({ adminUserid }).lean();
  }

  async deleteUserCategories(adminUserid: string, name: string) {
    return this.categoryModel.deleteOne({ adminUserid, name });
  }
} 