import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinHouseholdDto {
  @ApiProperty({ description: 'Invite code to join a household' })
  @IsNotEmpty({ message: 'Invite code is required' })
  @IsString()
  inviteCode: string;
}
