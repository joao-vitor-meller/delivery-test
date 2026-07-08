import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { FindOrdersQueryDto } from './dto/find-orders-query.dto';
import { Pedido } from '../database/entities/pedido.entity';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary:
      'Cria um novo pedido. Se o e-mail do cliente ainda não estiver cadastrado, o cliente é criado automaticamente',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Pedido criado com sucesso',
    type: Pedido,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Produto não encontrado',
  })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Lista pedidos, com filtros opcionais de status, cliente e período',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de pedidos',
    type: [Pedido],
  })
  findAll(@Query() query: FindOrdersQueryDto) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um pedido pelo id' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Identificador do pedido',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pedido encontrado',
    type: Pedido,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pedido não encontrado',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualiza o status de um pedido' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Identificador do pedido',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Status atualizado com sucesso',
    type: Pedido,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Status inválido',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pedido não encontrado',
  })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto);
  }
}
