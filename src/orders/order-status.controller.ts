import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { Status } from '../database/entities/status.entity';
import { Auth } from '../auth/decorators/auth.decorator';

@ApiTags('Orders')
@Auth()
@Controller('orders-status')
export class OrderStatusController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista os status de pedido disponíveis, usados para filtrar e atualizar pedidos (ADMIN/CLIENTE)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de status',
    type: [Status],
  })
  findAll() {
    return this.ordersService.findAllStatuses();
  }
}
