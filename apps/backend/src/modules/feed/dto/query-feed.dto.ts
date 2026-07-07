import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class QueryFeedDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  circleId?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsString()
  cursor?: string;
}
