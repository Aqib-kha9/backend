import { IsString, IsObject, IsOptional } from 'class-validator';

export class ReceiveTallyDto {
  @IsString()
  requestId: string;

  @IsString()
  companyName: string;

  @IsObject()
  data: any;

  @IsString()
  timestamp: string;

  @IsString()
  @IsOptional()
  error?: string;
}

