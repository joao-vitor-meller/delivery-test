import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { Cliente } from '../database/entities/cliente.entity';
import { Pedido } from '../database/entities/pedido.entity';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';

const PEDIDO_STATUS_ATUALIZADO_EVENT = 'pedido:status-atualizado';

@WebSocketGateway({ cors: { origin: true } })
export class OrdersGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(OrdersGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Cliente)
    private readonly clientesRepository: Repository<Cliente>,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      const cliente = await this.clientesRepository.findOneBy({
        id: payload.sub,
      });
      if (!cliente) {
        return;
      }

      await client.join(`cliente-${cliente.id}`);
      if (cliente.role === Role.ADMIN) {
        await client.join('admins');
      }
    } catch {
      this.logger.warn(`Conexão websocket com token inválido: ${client.id}`);
    }
  }

  @SubscribeMessage('acompanhar-pedido')
  async handleAcompanharPedido(
    @MessageBody() data: { pedidoId?: number },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const pedidoId = Number(data?.pedidoId);
    if (!pedidoId) {
      return;
    }
    await client.join(`pedido-${pedidoId}`);
  }

  emitStatusAtualizado(pedido: Pedido): void {
    this.server
      .to(`pedido-${pedido.id}`)
      .to(`cliente-${pedido.cliente.id}`)
      .to('admins')
      .emit(PEDIDO_STATUS_ATUALIZADO_EVENT, pedido);
  }
}
