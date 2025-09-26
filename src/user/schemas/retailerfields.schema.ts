import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Retailerfield extends Document {   

  @Prop({ required: true, unique: true })
  userid: string;

  @Prop({ type: [String], default: [] })
  fields: string[];

  @Prop({ type: [String], default: ['all'] })
  tally_account: string[];

}

export const RetailerfieldSchema = SchemaFactory.createForClass(Retailerfield);
