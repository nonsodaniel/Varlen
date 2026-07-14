import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsNotEmpty,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBudgetDto {
  @ApiProperty({ description: 'Budget category (custom or standard)' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ description: 'Budget limit amount', minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  limit: number;

  @ApiPropertyOptional({ description: 'Budget period', default: 'monthly', enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'] })
  @IsOptional()
  @IsIn(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'])
  period?: string = 'monthly';
}
