import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SyncPullDto {
  @ApiProperty({ description: 'ISO date string for last sync time' })
  @IsString()
  since: string;

  @ApiProperty({ description: 'Last known sync version' })
  @Type(() => Number)
  @IsNumber()
  version: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;
}
