import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  token: string; // raw token from frontend; will be hashed server-side and matched

  @IsString()
  companyName: string;

  @IsNumber()
  port: number;

  @IsOptional()
  @IsString()
  time?: string;
}

