import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: true })
export class WallpaperEntry {
  @Prop({ type: String, enum: ['wallpaper', 'banner'], required: true })
  type: 'wallpaper' | 'banner';

  @Prop({ type: String, enum: ['desktop', 'mobile'], required: true })
  device: 'desktop' | 'mobile';

  @Prop({ type: String, required: true })
  url: string; // This is the only field for the image location

  // Add _id for subdocument
  _id?: any;
}

@Schema()
export class Wallpaper extends Document {
  @Prop({ required: true, unique: true })
  userid: string;

  @Prop({ type: [WallpaperEntry], default: [] })
  images: WallpaperEntry[];
}

export const WallpaperEntrySchema = SchemaFactory.createForClass(WallpaperEntry);
export const WallpaperSchema = SchemaFactory.createForClass(Wallpaper);