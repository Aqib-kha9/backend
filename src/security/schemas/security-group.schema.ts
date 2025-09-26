import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class SecurityGroup extends Document {
  @Prop({ required: true })
  groupid: number;

  @Prop({ required: true })
  role: string;

  @Prop()
  description: string;
}

export const SecurityGroupSchema = SchemaFactory.createForClass(SecurityGroup);
