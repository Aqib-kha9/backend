import { IsString, IsOptional } from 'class-validator';

export class CreateBannerDto {
  @IsString()
  device: string;

  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  topText?: string;

  @IsOptional()
  @IsString()
  cloudinaryPublicId?: string;
}