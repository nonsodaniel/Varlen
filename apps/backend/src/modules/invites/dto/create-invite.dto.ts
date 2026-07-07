import { IsOptional, IsString, IsEnum } from 'class-validator';
import { HouseholdRole } from '@prisma/client';

export class CreateInviteDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(HouseholdRole)
  role?: HouseholdRole;
}
