import {
  IsString,
  IsNumber,
  IsDateString,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGoalDto {
  @ApiProperty({ description: 'Goal title', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Target value', minimum: 1 })
  @IsNumber()
  @Min(1)
  target: number;

  @ApiProperty({ description: 'Unit of measurement (e.g. "books", "miles", "dollars")' })
  @IsString()
  unit: string;

  @ApiProperty({ description: 'Deadline in ISO 8601 format' })
  @IsDateString()
  deadline: string;

  @ApiProperty({ description: 'Color hex code for the goal' })
  @IsString()
  color: string;
}
