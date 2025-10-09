import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Task extends Document {
  @Prop({ required: true })
  requestId: string;

  @Prop({ required: true })
  agentId: string;

  @Prop({ required: true })
  action: string;

  @Prop({ type: Object })
  payload?: Record<string, any>;

  @Prop({ default: 'PENDING' })
  status: string;

  @Prop() // ✅ ADD: Result field
  result?: string;

  @Prop() // ✅ ADD: Error field
  error?: string;
}

export const TaskSchema = SchemaFactory.createForClass(Task);