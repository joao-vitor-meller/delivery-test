import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderStatusController } from './order-status.controller';
import { OrdersGateway } from './orders.gateway';
import { Pedido } from '../database/entities/pedido.entity';
import { Produto } from '../database/entities/produto.entity';
import { Status } from '../database/entities/status.entity';
import { Cliente } from '../database/entities/cliente.entity';
import { MailModule } from '../mail/mail.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pedido, Produto, Status, Cliente]),
    MailModule,
    AuthModule,
  ],
  controllers: [OrdersController, OrderStatusController],
  providers: [OrdersService, OrdersGateway],
})
export class OrdersModule {}
