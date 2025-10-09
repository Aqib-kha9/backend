import { IsString, IsObject } from 'class-validator';

export class ReceiveTallyDto {
  @IsString()
  requestId: string;

  @IsString()
  companyName: string;

  @IsObject()
  data: any;

  @IsString()
  timestamp: string;
}

