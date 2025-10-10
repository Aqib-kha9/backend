import { IsString, IsOptional } from 'class-validator';

export class CreateWallpaperDto {
  @IsString()
  device: string;

  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  cloudinaryPublicId?: string;
}