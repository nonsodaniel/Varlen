import { IsOptional, IsArray, IsString, IsEnum } from 'class-validator';
import { SharePermission } from '@prisma/client';

export class ShareItemDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  circleIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @IsOptional()
  @IsEnum(SharePermission)
  permission?: SharePermission;
}
