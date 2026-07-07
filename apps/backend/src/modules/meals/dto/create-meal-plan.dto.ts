import {
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum MealType {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  SNACK = 'SNACK',
}

export class CreateMealPlanDto {
  @ApiProperty({ description: 'Date in ISO 8601 format' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: MealType, description: 'Meal type slot' })
  @IsEnum(MealType)
  mealType: MealType;

  @ApiPropertyOptional({ description: 'ID of a saved meal to assign' })
  @IsOptional()
  @IsString()
  mealId?: string;

  @ApiPropertyOptional({ description: 'Custom meal title if no saved meal' })
  @IsOptional()
  @IsString()
  customTitle?: string;
}
