import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'oldPassword123' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  oldPassword: string;

  @ApiProperty({ example: 'newSecurePassword456' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}
