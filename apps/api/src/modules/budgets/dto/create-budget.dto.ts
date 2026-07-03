import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory } from '@prisma/client';

export class CreateBudgetDto {
  @ApiProperty({ description: 'Expense category for this budget', enum: ExpenseCategory })
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @ApiProperty({ description: 'Budget limit amount', minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  limit: number;

  @ApiPropertyOptional({ description: 'Budget period (e.g. "monthly", "weekly")', default: 'monthly' })
  @IsOptional()
  @IsString()
  period?: string = 'monthly';
}
