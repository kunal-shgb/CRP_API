import { PartialType } from '@nestjs/mapped-types';
import { CreateRegionalOfficeDto } from './create-regional-office.dto';

export class UpdateRegionalOfficeDto extends PartialType(CreateRegionalOfficeDto) {}
