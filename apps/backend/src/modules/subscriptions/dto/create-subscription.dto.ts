import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory } from '@prisma/client';

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'Subscription name', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'Subscription amount', minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string = 'USD';

  @ApiPropertyOptional({ description: 'Billing cycle (e.g. "monthly", "yearly")', default: 'monthly' })
  @IsOptional()
  @IsString()
  cycle?: string = 'monthly';

  @ApiPropertyOptional({ description: 'Expense category', enum: ExpenseCategory, default: 'OTHER' })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory = ExpenseCategory.OTHER;

  @ApiProperty({ description: 'Next billing date in ISO 8601 format' })
  @IsDateString()
  nextBillingDate: string;

  @ApiPropertyOptional({ description: 'Whether the subscription is shared', default: true })
  @IsOptional()
  @IsBoolean()
  shared?: boolean = true;
}
