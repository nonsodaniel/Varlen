import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ example: 'clxyz123abc' })
  id: string;

  @ApiProperty({ example: 'alex@example.com' })
  email: string;

  @ApiProperty({ example: 'Alex' })
  name: string;

  @ApiPropertyOptional({ example: 'clxyz456def' })
  householdId?: string;

  @ApiPropertyOptional({ example: 'OWNER' })
  role?: string;

  @ApiProperty({ example: true })
  emailVerified: boolean;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  accessToken: string;

  @ApiProperty({ example: 'a1b2c3d4e5f6...' })
  refreshToken: string;

  @ApiProperty({ example: 900, description: 'Token expiry in seconds' })
  expiresIn: number;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}
