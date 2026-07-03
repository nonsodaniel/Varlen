import { PartialType } from '@nestjs/swagger';
import { CreateTimelineEntryDto } from './create-timeline-entry.dto';

export class UpdateTimelineEntryDto extends PartialType(CreateTimelineEntryDto) {}
