import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'tally_data', timestamps: true })
export class TallyData extends Document {
  @Prop({ required: true })
  requestId: string;

  @Prop({ required: true })
  companyName: string;

  @Prop({ type: Object, required: true })
  data: any;

  @Prop({ required: true })
  timestamp: string;

  @Prop({ required: true })
  agentId: string;
}

export const TallyDataSchema = SchemaFactory.createForClass(TallyData);

