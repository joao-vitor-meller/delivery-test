import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  EntityManager,
  FindOptionsWhere,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { Pedido } from '../database/entities/pedido.entity';
import { PedidoItem } from '../database/entities/pedido-item.entity';
import { PedidoStatusHistorico } from '../database/entities/pedido-status-historico.entity';
import { Cliente } from '../database/entities/cliente.entity';
import { Produto } from '../database/entities/produto.entity';
import { Status } from '../database/entities/status.entity';
import { CreateOrderClienteDto, CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { FindOrdersQueryDto } from './dto/find-orders-query.dto';
import { MailService } from '../mail/mail.service';
import { OrdersGateway } from './orders.gateway';

const STATUS_INICIAL = 'pendente';
const STATUS_CANCELADO = 'cancelado';
const POSTGRES_UNIQUE_VIOLATION = '23505';

function endOfDay(dateString: string): Date {
  const date = new Date(dateString);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Pedido)
    private readonly pedidosRepository: Repository<Pedido>,
    @InjectRepository(Produto)
    private readonly produtosRepository: Repository<Produto>,
    @InjectRepository(Status)
    private readonly statusRepository: Repository<Status>,
    private readonly mailService: MailService,
    private readonly ordersGateway: OrdersGateway,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Pedido> {
    const status = await this.statusRepository.findOneBy({
      nome: STATUS_INICIAL,
    });
    if (!status) {
      throw new BadRequestException(
        `Status "${STATUS_INICIAL}" não está configurado`,
      );
    }

    const produtoIds = createOrderDto.itens.map((item) => item.produtoId);
    const produtos = await this.produtosRepository.findBy({
      id: In(produtoIds),
    });
    const produtosPorId = new Map(
      produtos.map((produto) => [produto.id, produto]),
    );

    const itensInput = createOrderDto.itens.map((item) => {
      const produto = produtosPorId.get(item.produtoId);
      if (!produto) {
        throw new NotFoundException(
          `Produto #${item.produtoId} não encontrado`,
        );
      }
      return {
        produto,
        quantidade: item.quantidade,
        precoUnitario: produto.preco,
      };
    });

    const valorTotal = itensInput.reduce(
      (total, item) => total + Number(item.precoUnitario) * item.quantidade,
      0,
    );

    const pedido = await this.pedidosRepository.manager.transaction(
      async (manager) => {
        const cliente = await this.findOrCreateCliente(
          manager,
          createOrderDto.cliente,
        );

        const pedidoSalvo = await manager.save(
          manager.create(Pedido, {
            cliente,
            status,
            valorTotal: valorTotal.toFixed(2),
          }),
        );

        for (const item of itensInput) {
          const result = await manager
            .createQueryBuilder()
            .update(Produto)
            .set({ estoque: () => `estoque - ${item.quantidade}` })
            .where('id = :id AND estoque >= :quantidade', {
              id: item.produto.id,
              quantidade: item.quantidade,
            })
            .execute();

          if (result.affected === 0) {
            throw new BadRequestException(
              `Estoque insuficiente para o produto "${item.produto.nome}"`,
            );
          }
        }

        const itens = itensInput.map((item) =>
          manager.create(PedidoItem, { ...item, pedido: pedidoSalvo }),
        );
        await manager.save(itens);

        await manager.save(
          manager.create(PedidoStatusHistorico, {
            pedido: pedidoSalvo,
            status,
          }),
        );

        return pedidoSalvo;
      },
    );

    const pedidoCompleto = await this.findOne(pedido.id);
    await this.mailService.sendOrderCreated(pedidoCompleto);
    return pedidoCompleto;
  }

  findAll(query: FindOrdersQueryDto): Promise<Pedido[]> {
    const where: FindOptionsWhere<Pedido> = {};

    if (query.statusId) {
      where.status = { id: query.statusId };
    }
    if (query.clienteId) {
      where.cliente = { id: query.clienteId };
    }
    if (query.dataInicio && query.dataFim) {
      where.data = Between(new Date(query.dataInicio), endOfDay(query.dataFim));
    } else if (query.dataInicio) {
      where.data = MoreThanOrEqual(new Date(query.dataInicio));
    } else if (query.dataFim) {
      where.data = LessThanOrEqual(endOfDay(query.dataFim));
    }

    return this.pedidosRepository.find({
      where,
      relations: { cliente: true, status: true, itens: { produto: true } },
      order: { data: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Pedido> {
    const pedido = await this.pedidosRepository.findOne({
      where: { id },
      relations: { cliente: true, status: true, itens: { produto: true } },
    });
    if (!pedido) {
      throw new NotFoundException(`Pedido #${id} não encontrado`);
    }
    return pedido;
  }

  async updateStatus(
    id: number,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<Pedido> {
    const pedido = await this.findOne(id);

    const status = await this.statusRepository.findOneBy({
      id: updateOrderStatusDto.statusId,
    });
    if (!status) {
      throw new BadRequestException(
        `Status #${updateOrderStatusDto.statusId} inválido`,
      );
    }

    const estavaCancelado = pedido.status.nome === STATUS_CANCELADO;
    const vaiCancelar = status.nome === STATUS_CANCELADO;
    pedido.status = status;

    await this.pedidosRepository.manager.transaction(async (manager) => {
      await manager.save(pedido);
      await manager.save(
        manager.create(PedidoStatusHistorico, { pedido, status }),
      );

      if (!estavaCancelado && vaiCancelar) {
        for (const item of pedido.itens) {
          await manager.increment(
            Produto,
            { id: item.produto.id },
            'estoque',
            item.quantidade,
          );
        }
      }
    });

    const pedidoAtualizado = await this.findOne(id);
    await this.mailService.sendOrderStatusUpdated(pedidoAtualizado);
    this.ordersGateway.emitStatusAtualizado(pedidoAtualizado);
    return pedidoAtualizado;
  }

  findAllStatuses(): Promise<Status[]> {
    return this.statusRepository.find({ order: { id: 'ASC' } });
  }

  private async findOrCreateCliente(
    manager: EntityManager,
    clienteDto: CreateOrderClienteDto,
  ): Promise<Cliente> {
    const existente = await manager.findOneBy(Cliente, {
      email: clienteDto.email,
    });
    if (existente) {
      if (clienteDto.nome && clienteDto.nome !== existente.nome) {
        existente.nome = clienteDto.nome;
        return manager.save(existente);
      }
      return existente;
    }

    if (!clienteDto.nome) {
      throw new BadRequestException(
        'Nome do cliente é obrigatório para cadastrar um novo cliente',
      );
    }

    try {
      return await manager.save(
        manager.create(Cliente, {
          nome: clienteDto.nome,
          email: clienteDto.email,
        }),
      );
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as unknown as { code?: string }).code ===
          POSTGRES_UNIQUE_VIOLATION
      ) {
        const cliente = await manager.findOneBy(Cliente, {
          email: clienteDto.email,
        });
        if (cliente) {
          return cliente;
        }
      }
      throw error;
    }
  }
}
