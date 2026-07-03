import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignTaskDto {
  @ApiProperty({ description: 'User ID to assign the task to' })
  @IsString()
  assignedToId: string;
}
