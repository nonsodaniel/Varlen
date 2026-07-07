import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

enum CircleType {
  PRIMARY = 'PRIMARY',
  EXTENDED = 'EXTENDED',
  FRIENDS = 'FRIENDS',
  CUSTOM = 'CUSTOM',
}

export class UpdateCircleDto {
  @ApiPropertyOptional({ description: 'Circle name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: CircleType })
  @IsOptional()
  @IsEnum(CircleType)
  type?: CircleType;

  @ApiPropertyOptional({ description: 'Emoji identifier' })
  @IsOptional()
  @IsString()
  emoji?: string;

  @ApiPropertyOptional({ description: 'Circle color hex' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Circle description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
