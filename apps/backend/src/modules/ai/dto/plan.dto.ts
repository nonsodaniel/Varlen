import { IsString, IsIn, IsOptional, IsArray } from 'class-validator';

export class PlanDto {
  @IsString()
  @IsIn(['date', 'weekend', 'meal', 'celebration'])
  type: string;

  @IsOptional()
  @IsArray()
  vibes?: string[];

  @IsOptional()
  @IsString()
  budget?: string;

  @IsOptional()
  @IsString()
  freeText?: string;
}
