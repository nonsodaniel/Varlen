import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AppleAuthDto {
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIs...',
    description: 'Apple identity token received from the client',
  })
  @IsString()
  @IsNotEmpty()
  identityToken: string;

  @ApiProperty({
    example: 'Jane Doe',
    description: 'Full name from Apple (only provided on first sign-in)',
    required: false,
  })
  @IsString()
  @IsOptional()
  fullName?: string;
}
