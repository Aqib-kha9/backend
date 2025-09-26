  import {  IsEmail, IsInt, IsNotEmpty, IsString, IsMongoId} from "class-validator";

  export class RegisteraccessDto {
      @IsEmail()
      email: string;

      @IsNotEmpty()
      id: string;

      @IsNotEmpty()
      subscription : number;
      
    } 