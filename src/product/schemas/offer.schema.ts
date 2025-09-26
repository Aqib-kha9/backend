// offer.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OfferDocument = Offer & Document;

@Schema()
export class Offer {
  @Prop({ required: true })
  product_id: string;

  @Prop({ required: true })
  party_id: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ required: true, enum: ['percentage', 'flat', 'manual'] })
  offer_type: 'percentage' | 'flat' | 'manual';

  @Prop({ required: true })
  offer_value: number;

  @Prop({ enum: ['all', 'custom'], default: 'all' })
  apply_to: 'all' | 'custom';

  @Prop({ type: [String], default: [] })
  target_retailers?: string[];

  @Prop({ required: true })
  valid_from: Date;

  @Prop({ required: true })
  valid_to: Date;

  @Prop({ default: Date.now })
  created_at?: Date;
}

export const OfferSchema = SchemaFactory.createForClass(Offer);