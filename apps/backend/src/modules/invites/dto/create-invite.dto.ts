import { IsOptional, IsString, IsEmail, IsEnum, MaxLength } from 'class-validator';
import { HouseholdRole } from '@prisma/client';

export class CreateInviteDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEnum(HouseholdRole)
  role?: HouseholdRole;
}
