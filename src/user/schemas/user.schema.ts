import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';



@Schema({ _id: false }) // _id: false prevents automatic _id creation for subdocs in array
export class TallyCompany {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  number: number;
}

export const TallyCompanySchema = SchemaFactory.createForClass(TallyCompany);

@Schema()
export class User extends Document {

  @Prop()
  name: string;

  @Prop({ unique: true })
  userid: string;

  @Prop({ unique: true })
  email: string;

  @Prop()
  password: string;

  @Prop()
  phonenumber: string;

  @Prop()
  city: string;
  
  @Prop()
  state: string;

  @Prop()
  zip: string;

  @Prop()
  created_stamp: Date;

  @Prop()
  subscription_update : Date;
  
  @Prop()
  adminid: string;

  @Prop()
  status: string;

  @Prop()
  lastlogin: Date;
  
  @Prop()
  subscription : number;

  @Prop({ type: Object, default: {} })
  tallyFieldMapping: { [key: string]: string };

  @Prop({ type: [TallyCompanySchema], default: [] })
  tallyCompanies: TallyCompany[];


}

export const UserSchema = SchemaFactory.createForClass(User);


