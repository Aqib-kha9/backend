import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InventoryDocument = Inventory & Document;

@Schema({ strict: false })
export class Inventory {
  @Prop({ required: true })
  product_id: string;

  @Prop()
  party_id: string;

  @Prop({ required: true })
  quantity: number;

  @Prop()
  batch_no?: string;

  @Prop()
  expiry_date?: Date;

  @Prop({ default: Date.now })
  updated_at?: Date;
}

export const InventorySchema = SchemaFactory.createForClass(Inventory);