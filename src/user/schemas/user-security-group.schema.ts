import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class UserSecurityGroup extends Document {

  @Prop({ required: true })
  groupid: number;

  @Prop({ required: true, unique: true })
  userid: string;

  @Prop()
  from_date: Date;

  @Prop()
  thru_date: Date;

}

export const UserSecurityGroupSchema = SchemaFactory.createForClass(UserSecurityGroup);
