import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Wallpaper extends Document {
  @Prop({ required: true })
  ownerId: string;

  @Prop({ required: true })
  ownerRole: string;

  @Prop({ required: true })
  device: string;

  @Prop({ required: true })
  url: string;

  @Prop()
  cloudinaryPublicId?: string;
}

export const WallpaperSchema = SchemaFactory.createForClass(Wallpaper);