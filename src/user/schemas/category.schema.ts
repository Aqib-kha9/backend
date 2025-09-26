import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema()
export class Category {
  @Prop({ required: true })
  adminUserid: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: [String], required: true })
  productIds: string[];
}

export const CategorySchema = SchemaFactory.createForClass(Category); 