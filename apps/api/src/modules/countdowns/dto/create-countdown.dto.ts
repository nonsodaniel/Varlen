import {
  IsString,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCountdownDto {
  @ApiProperty({ description: 'Countdown title', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Target date in ISO 8601 format' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Emoji icon' })
  @IsString()
  emoji: string;

  @ApiProperty({ description: 'Color hex code' })
  @IsString()
  color: string;
}
