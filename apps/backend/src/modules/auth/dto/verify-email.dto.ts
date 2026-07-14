import { IsEmail, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ example: 'alex@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '482910', description: '6-digit verification code' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Verification code must be exactly 6 digits' })
  code: string;
}
