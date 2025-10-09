import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true }) // enables createdAt and updatedAt
export class PendingTask extends Document {
  @Prop({ required: true })
  userid: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  status: string;

  // <-- fix: explicitly set type as Object
  @Prop({ type: Object, default: {} })
  payload: any;

  @Prop()
  scheduledAt?: Date;

  @Prop()
  completedAt?: Date;
}

export const PendingTaskSchema = SchemaFactory.createForClass(PendingTask);
