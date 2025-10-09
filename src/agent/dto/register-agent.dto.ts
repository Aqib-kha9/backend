// dto/register-agent.dto.ts
import { IsString, IsNumber, IsOptional, Min, Max, IsNotEmpty } from 'class-validator';

export class RegisterAgentDto {
  @IsString()
  @IsNotEmpty()
  backendUrl: string;

  @IsString()
  @IsNotEmpty()
  authToken: string;

  @IsNumber()
  @Min(9000)
  @Max(10000)
  tallyPort: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  userid: string; // ✅ Add this field
}