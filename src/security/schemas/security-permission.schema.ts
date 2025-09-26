import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class SecurityPermission extends Document {
  @Prop({ required: true })
  permission_id: string;

  @Prop()
  description: string;
}

export const SecurityPermissionSchema = SchemaFactory.createForClass(SecurityPermission);
