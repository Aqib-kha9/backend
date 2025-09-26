import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PartyDocument = Party & Document;

@Schema()
export class Party extends Document{
  @Prop({ required: true })
  party_id: string; // e.g. PTY1001

  @Prop({ required: true })
  userid: string;

  @Prop({ required: true })
  party_type: 'supplier' | 'vendor' | 'retailer' | 'customer';

  @Prop()
  store_name: string;

  @Prop({ default: Date.now })
  created_at?: Date;
}

export const PartySchema = SchemaFactory.createForClass(Party);