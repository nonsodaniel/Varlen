import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { HouseholdRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'New role for the household member',
    enum: HouseholdRole,
  })
  @IsEnum(HouseholdRole, {
    message: 'role must be one of: OWNER, PARTNER, CHILD, FAMILY, ROOMMATE',
  })
  role: HouseholdRole;
}
