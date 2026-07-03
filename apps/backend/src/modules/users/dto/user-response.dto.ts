import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'Display name' })
  name: string;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiPropertyOptional({ description: 'Avatar image URL' })
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'User accent color (hex)' })
  color?: string;

  @ApiProperty({ description: 'Account creation timestamp' })
  createdAt: Date;
}
