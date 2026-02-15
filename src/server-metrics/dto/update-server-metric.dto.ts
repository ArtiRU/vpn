import { PartialType } from '@nestjs/swagger';
import { CreateServerMetricDto } from './create-server-metric.dto';

export class UpdateServerMetricDto extends PartialType(CreateServerMetricDto) {}
