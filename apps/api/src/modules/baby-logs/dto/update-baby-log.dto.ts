import { PartialType } from '@nestjs/swagger';
import { CreateBabyLogDto } from './create-baby-log.dto';

export class UpdateBabyLogDto extends PartialType(CreateBabyLogDto) {}
