import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JoinWaitlistDto {
  @ApiProperty({ description: 'Email address to join the waitlist' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Name of the person joining' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Source of signup (landing, social, etc.)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;
}
