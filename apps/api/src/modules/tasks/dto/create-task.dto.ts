import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecurringType, Priority } from '@prisma/client';

export class CreateTaskDto {
  @ApiProperty({ description: 'Task title', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Task description', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Due date in ISO 8601 format' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Task priority', enum: Priority, default: 'MEDIUM' })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority = Priority.MEDIUM;

  @ApiPropertyOptional({ description: 'User ID to assign the task to' })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Whether the task is shared with the household', default: true })
  @IsOptional()
  @IsBoolean()
  shared?: boolean = true;

  @ApiPropertyOptional({ description: 'Task category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Recurring type', enum: RecurringType })
  @IsOptional()
  @IsEnum(RecurringType)
  recurring?: RecurringType;

  @ApiPropertyOptional({ description: 'Whether the task is a chore', default: false })
  @IsOptional()
  @IsBoolean()
  isChore?: boolean = false;
}
