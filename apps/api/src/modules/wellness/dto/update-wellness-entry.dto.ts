import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateWellnessEntryDto } from './create-wellness-entry.dto';

export class UpdateWellnessEntryDto extends PartialType(
  OmitType(CreateWellnessEntryDto, ['date'] as const),
) {}
