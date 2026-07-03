import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryMemoriesDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by memory type' })
  @IsOptional()
  @IsString()
  type?: string;
}
