import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class SecurityGroupPermission extends Document {
  @Prop({ required: true })
  groupid: number;

  @Prop({ required: true })
  permission_id: string;
}

export const SecurityGroupPermissionSchema = SchemaFactory.createForClass(SecurityGroupPermission);
