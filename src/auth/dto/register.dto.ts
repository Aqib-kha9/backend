// src/auth/dto/register.dto.ts
import { IsEmail, IsNotEmpty, Length, IsString, IsDate } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @Length(6)
  password: string;

  @IsNotEmpty()
  @Length(6)
  confirmpassword: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  phonenumber: string;
 
  @IsNotEmpty()
  @IsString()
  city: string;

  @IsNotEmpty()
  @IsString()
  state: string;

  @IsNotEmpty()
  @IsString()
  zip : string;

  @IsNotEmpty()
  @IsString()
  store : string;
  
}
