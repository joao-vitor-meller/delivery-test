import { OmitType } from '@nestjs/swagger';
import { FindOrdersQueryDto } from './find-orders-query.dto';

export class FindMyOrdersQueryDto extends OmitType(FindOrdersQueryDto, [
  'clienteId',
] as const) {}
