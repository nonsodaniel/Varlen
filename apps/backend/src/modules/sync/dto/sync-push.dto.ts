import { IsArray, IsString, ValidateNested, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SyncChange {
  @ApiProperty({ enum: ['create', 'update', 'delete'] })
  @IsEnum(['create', 'update', 'delete'])
  operation: 'create' | 'update' | 'delete';

  @ApiProperty()
  @IsString()
  model: string;

  @ApiProperty()
  @IsString()
  id: string;

  @ApiPropertyOptional()
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  syncVersion?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientId?: string;
}

export class SyncPushDto {
  @ApiProperty({ type: [SyncChange] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncChange)
  changes: SyncChange[];

  @ApiProperty()
  @IsString()
  deviceId: string;
}
