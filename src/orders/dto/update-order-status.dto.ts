import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class UpdateOrderStatusDto {
  @ApiProperty({
    description:
      'Identificador do novo status do pedido (ver GET /orders-status)',
    example: 2,
  })
  @IsInt()
  @IsPositive()
  statusId?: number;
}
