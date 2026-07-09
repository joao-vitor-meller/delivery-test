import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Pedido } from '../database/entities/pedido.entity';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendOrderCreated(pedido: Pedido): Promise<void> {
    await this.send(
      pedido.cliente.email,
      `Pedido #${pedido.id} criado com sucesso`,
      'order-created',
      {
        nomeCliente: pedido.cliente.nome,
        pedidoId: pedido.id,
        valorTotal: pedido.valorTotal,
        itens: pedido.itens,
      },
    );
  }

  async sendOrderStatusUpdated(pedido: Pedido): Promise<void> {
    await this.send(
      pedido.cliente.email,
      `Pedido #${pedido.id} atualizado: ${pedido.status.nome}`,
      'order-status-updated',
      {
        nomeCliente: pedido.cliente.nome,
        pedidoId: pedido.id,
        status: pedido.status.nome,
      },
    );
  }

  private async send(
    to: string,
    subject: string,
    template: string,
    context: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({ to, subject, template, context });
      this.logger.log(`E-mail "${subject}" enviado para ${to}`);
    } catch (error) {
      this.logger.error(
        `Falha ao enviar e-mail "${subject}" para ${to}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
