import { PartialType } from '@nestjs/swagger';
import { CreateCountdownDto } from './create-countdown.dto';

export class UpdateCountdownDto extends PartialType(CreateCountdownDto) {}
