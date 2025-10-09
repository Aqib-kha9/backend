import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Agent extends Document {
  @Prop({ required: true, unique: true })
  agentId: string;

  @Prop()
  name?: string;

  @Prop({ required: true })
  tokenHash: string;

  @Prop({ required: true, min: 9000, max: 10000 })
  port: number;

  @Prop({ default: Date.now })
  lastSeen: Date;
  
  @Prop({ required: true }) // ✅ Yeh field ab available hoga
  userid: string;
}

export const AgentSchema = SchemaFactory.createForClass(Agent);