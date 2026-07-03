import { ApiProperty } from '@nestjs/swagger';

export class InviteResponseDto {
  @ApiProperty({ description: 'Invite code for joining the household' })
  inviteCode: string;
}
