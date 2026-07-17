import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ShareFamilyDto {
  @ApiProperty({ description: 'User ID to share family plan with' })
  @IsString()
  userId: string;
}
