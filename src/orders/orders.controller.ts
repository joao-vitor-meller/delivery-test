import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { FindOrdersQueryDto } from './dto/find-orders-query.dto';
import { FindMyOrdersQueryDto } from './dto/find-my-orders-query.dto';
import { Pedido } from '../database/entities/pedido.entity';
import { Cliente } from '../database/entities/cliente.entity';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary:
      'Cria um novo pedido. Se o e-mail do cliente ainda não estiver cadastrado, o cliente é criado automaticamente (PÚBLICO)',
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
  @Auth(Role.ADMIN)
  @ApiOperation({
    summary:
      'Lista pedidos, com filtros opcionais de status, cliente e período (ADMIN)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de pedidos',
    type: [Pedido],
  })
  findAll(@Query() query: FindOrdersQueryDto) {
    return this.ordersService.findAll(query);
  }

  @Get('me')
  @Auth()
  @ApiOperation({
    summary:
      'Lista os pedidos do cliente autenticado, com filtros opcionais de status e período (ADMIN/CLIENTE)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de pedidos do cliente autenticado',
    type: [Pedido],
  })
  findMine(
    @CurrentUser() cliente: Cliente,
    @Query() query: FindMyOrdersQueryDto,
  ) {
    return this.ordersService.findAll({ ...query, clienteId: cliente.id });
  }

  @Get('track/:token')
  @ApiOperation({
    summary:
      'Busca um pedido pelo token de rastreio (link público, sem necessidade de login)',
  })
  @ApiParam({
    name: 'token',
    type: String,
    description: 'Token de rastreio do pedido',
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
  findByTrackingToken(@Param('token', ParseUUIDPipe) token: string) {
    return this.ordersService.findOneByTrackingToken(token);
  }

  @Get(':id')
  @Auth()
  @ApiOperation({
    summary:
      'Busca um pedido pelo id (ADMIN busca qualquer pedido; CLIENTE apenas os seus)',
  })
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
    status: HttpStatus.FORBIDDEN,
    description: 'Pedido pertence a outro cliente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pedido não encontrado',
  })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() cliente: Cliente,
  ) {
    return this.ordersService.findOneForUser(id, cliente);
  }

  @Patch(':id/status')
  @Auth(Role.ADMIN)
  @ApiOperation({ summary: 'Atualiza o status de um pedido (ADMIN)' })
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
