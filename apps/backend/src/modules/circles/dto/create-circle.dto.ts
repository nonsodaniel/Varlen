import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum CircleType {
  PRIMARY = 'PRIMARY',
  EXTENDED = 'EXTENDED',
  FRIENDS = 'FRIENDS',
  CUSTOM = 'CUSTOM',
}

enum LifeMode {
  SINGLE = 'SINGLE',
  COUPLE = 'COUPLE',
  FAMILY = 'FAMILY',
  PARENTING = 'PARENTING',
}

export class CreateCircleDto {
  @ApiProperty({ description: 'Circle name', example: 'My Family' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ enum: CircleType, default: CircleType.CUSTOM })
  @IsOptional()
  @IsEnum(CircleType)
  type?: CircleType;

  @ApiPropertyOptional({ enum: LifeMode })
  @IsOptional()
  @IsEnum(LifeMode)
  mode?: LifeMode;

  @ApiPropertyOptional({ description: 'Emoji identifier', example: '👨‍👩‍👧' })
  @IsOptional()
  @IsString()
  emoji?: string;

  @ApiPropertyOptional({ description: 'Circle color hex', example: '#6366F1' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Circle description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
