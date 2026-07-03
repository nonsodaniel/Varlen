import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LifeMode } from '@prisma/client';

export class CreateHouseholdDto {
  @ApiProperty({ description: 'Household name', example: 'Our Home' })
  @IsNotEmpty({ message: 'Household name is required' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Life mode',
    enum: LifeMode,
    default: LifeMode.COUPLE,
  })
  @IsOptional()
  @IsEnum(LifeMode, { message: 'mode must be one of: SINGLE, COUPLE, FAMILY, PARENTING' })
  mode?: LifeMode;
}
