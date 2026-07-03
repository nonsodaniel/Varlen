import { IsOptional, IsEnum, IsDateString, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ExpenseCategory } from '@prisma/client';

export class QueryExpensesDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by category', enum: ExpenseCategory })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @ApiPropertyOptional({ description: 'Filter by payer user ID' })
  @IsOptional()
  @IsString()
  paidBy?: string;

  @ApiPropertyOptional({ description: 'Filter by settled status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  settled?: boolean;

  @ApiPropertyOptional({ description: 'Start date filter (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
