import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  Between,
  EntityManager,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
} from 'typeorm';
import { OrdersService } from './orders.service';
import { OrdersGateway } from './orders.gateway';
import { Pedido } from '../database/entities/pedido.entity';
import { Produto } from '../database/entities/produto.entity';
import { Status } from '../database/entities/status.entity';
import { Cliente } from '../database/entities/cliente.entity';
import { MailService } from '../mail/mail.service';
import { Role } from '../common/enums/role.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { FindOrdersQueryDto } from './dto/find-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

type TransactionCallback = (manager: EntityManager) => Promise<unknown>;

function mockRepository<T extends { id: number }>() {
  return {
    find: jest.fn<Promise<T[]>, [FindManyOptions<T>?]>(),
    findOne: jest.fn<Promise<T | null>, [FindOneOptions<T>]>(),
    findOneBy: jest.fn<Promise<T | null>, [FindOptionsWhere<T>]>(),
    findBy: jest.fn<Promise<T[]>, [FindOptionsWhere<T>]>(),
    manager: {
      transaction: jest.fn<Promise<unknown>, [TransactionCallback]>(),
    },
  };
}

function mockMailService() {
  return {
    sendOrderCreated: jest.fn<Promise<void>, [Pedido]>(),
    sendOrderStatusUpdated: jest.fn<Promise<void>, [Pedido]>(),
  };
}

function mockOrdersGateway() {
  return {
    emitStatusAtualizado: jest.fn<void, [Pedido]>(),
  };
}

function buildTransactionManager(
  options: {
    clienteExistente?: Cliente | null;
    estoqueAfetado?: number;
  } = {},
) {
  const { clienteExistente = null, estoqueAfetado = 1 } = options;

  const queryBuilder = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: estoqueAfetado }),
  };

  const manager = {
    findOneBy: jest.fn().mockResolvedValue(clienteExistente),
    create: jest.fn((_entity: unknown, data: unknown) => data),
    save: jest.fn((entity: unknown) =>
      Promise.resolve(
        Array.isArray(entity)
          ? entity
          : { id: 1, ...(entity as Record<string, unknown>) },
      ),
    ),
    createQueryBuilder: jest.fn(() => queryBuilder),
    increment: jest.fn().mockResolvedValue(undefined),
  };

  return { manager, queryBuilder };
}

describe('OrdersService', () => {
  let service: OrdersService;
  let pedidosRepository: ReturnType<typeof mockRepository<Pedido>>;
  let produtosRepository: ReturnType<typeof mockRepository<Produto>>;
  let statusRepository: ReturnType<typeof mockRepository<Status>>;
  let mailService: ReturnType<typeof mockMailService>;
  let ordersGateway: ReturnType<typeof mockOrdersGateway>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Pedido),
          useFactory: mockRepository<Pedido>,
        },
        {
          provide: getRepositoryToken(Produto),
          useFactory: mockRepository<Produto>,
        },
        {
          provide: getRepositoryToken(Status),
          useFactory: mockRepository<Status>,
        },
        { provide: MailService, useFactory: mockMailService },
        { provide: OrdersGateway, useFactory: mockOrdersGateway },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    pedidosRepository = module.get<ReturnType<typeof mockRepository<Pedido>>>(
      getRepositoryToken(Pedido),
    );
    produtosRepository = module.get<ReturnType<typeof mockRepository<Produto>>>(
      getRepositoryToken(Produto),
    );
    statusRepository = module.get<ReturnType<typeof mockRepository<Status>>>(
      getRepositoryToken(Status),
    );
    mailService = module.get<ReturnType<typeof mockMailService>>(MailService);
    ordersGateway =
      module.get<ReturnType<typeof mockOrdersGateway>>(OrdersGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Criação de pedido: valida status inicial, produtos, estoque (com baixa transacional),
  // cadastro/reaproveitamento de cliente pelo e-mail e disparo do e-mail de confirmação.
  describe('create', () => {
    const dto: CreateOrderDto = {
      cliente: { nome: 'João da Silva', email: 'joao@email.com' },
      itens: [{ produtoId: 1, quantidade: 2 }],
    };

    const statusPendente = { id: 1, nome: 'pendente' } as Status;
    const produto = {
      id: 1,
      nome: 'Pizza',
      preco: '39.90',
      estoque: 10,
    } as Produto;

    function stubTransaction(
      transactionOptions?: Parameters<typeof buildTransactionManager>[0],
    ) {
      const { manager } = buildTransactionManager(transactionOptions);
      pedidosRepository.manager.transaction.mockImplementation((cb) =>
        cb(manager as unknown as EntityManager),
      );
      return manager;
    }

    // Todo pedido novo precisa nascer com o status "pendente"; se essa linha não
    // existir na tabela de status, o pedido não pode ser criado.
    it('lança BadRequestException se o status "pendente" não estiver configurado', async () => {
      statusRepository.findOneBy.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(produtosRepository.findBy).not.toHaveBeenCalled();
    });

    // Se algum produtoId do pedido não existir na base, a criação deve falhar
    // antes de qualquer alteração no banco.
    it('lança NotFoundException se algum produto não existir', async () => {
      statusRepository.findOneBy.mockResolvedValue(statusPendente);
      produtosRepository.findBy.mockResolvedValue([]);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    // A baixa de estoque é feita com UPDATE condicional (estoque >= quantidade);
    // quando nenhuma linha é afetada, significa que não havia estoque suficiente.
    it('lança BadRequestException se o estoque for insuficiente', async () => {
      statusRepository.findOneBy.mockResolvedValue(statusPendente);
      produtosRepository.findBy.mockResolvedValue([produto]);
      stubTransaction({ estoqueAfetado: 0 });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    // Caminho feliz: cliente novo (identificado pelo e-mail) é cadastrado dentro da
    // mesma transação do pedido, e o e-mail de confirmação é enviado ao final.
    it('cria o pedido, cadastra o cliente novo e envia o e-mail de confirmação', async () => {
      statusRepository.findOneBy.mockResolvedValue(statusPendente);
      produtosRepository.findBy.mockResolvedValue([produto]);
      const manager = stubTransaction({ clienteExistente: null });
      const pedidoCompleto = { id: 1 } as Pedido;
      pedidosRepository.findOne.mockResolvedValue(pedidoCompleto);

      const resultado = await service.create(dto);

      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: 'João da Silva',
          email: 'joao@email.com',
        }),
      );
      expect(pedidosRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: { cliente: true, status: true, itens: { produto: true } },
      });
      expect(mailService.sendOrderCreated).toHaveBeenCalledWith(pedidoCompleto);
      expect(resultado).toBe(pedidoCompleto);
    });

    // Se já existe cliente com o e-mail informado, o pedido é associado a ele em vez
    // de criar um duplicado; e o nome cadastrado é atualizado se vier diferente.
    it('reaproveita o cliente existente e atualiza o nome quando ele mudou', async () => {
      const clienteExistente = {
        id: 5,
        nome: 'Nome Antigo',
        email: 'joao@email.com',
      } as Cliente;
      statusRepository.findOneBy.mockResolvedValue(statusPendente);
      produtosRepository.findBy.mockResolvedValue([produto]);
      const manager = stubTransaction({ clienteExistente });
      pedidosRepository.findOne.mockResolvedValue({ id: 1 } as Pedido);

      await service.create(dto);

      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 5, nome: 'João da Silva' }),
      );
    });

    // O nome só é opcional quando o cliente já existe; para cadastrar um cliente
    // novo, o nome é obrigatório.
    it('lança BadRequestException ao cadastrar cliente novo sem nome', async () => {
      const dtoSemNome: CreateOrderDto = {
        cliente: { email: 'novo@email.com' },
        itens: [{ produtoId: 1, quantidade: 1 }],
      };
      statusRepository.findOneBy.mockResolvedValue(statusPendente);
      produtosRepository.findBy.mockResolvedValue([produto]);
      stubTransaction({ clienteExistente: null });

      await expect(service.create(dtoSemNome)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // Listagem de pedidos com filtros opcionais (status, cliente, período).
  describe('findAll', () => {
    it('busca sem filtros quando nenhum é informado', async () => {
      pedidosRepository.find.mockResolvedValue([]);

      await service.findAll({} as FindOrdersQueryDto);

      expect(pedidosRepository.find).toHaveBeenCalledWith({
        where: {},
        relations: { cliente: true, status: true, itens: { produto: true } },
        order: { data: 'DESC' },
      });
    });

    it('filtra por statusId e clienteId', async () => {
      pedidosRepository.find.mockResolvedValue([]);

      await service.findAll({
        statusId: 2,
        clienteId: 7,
      });

      expect(pedidosRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { id: 2 }, cliente: { id: 7 } },
        }),
      );
    });

    // Quando as duas datas são informadas, o filtro usa Between (intervalo fechado,
    // do início do dia inicial ao fim do dia final).
    it('filtra por período completo (dataInicio e dataFim)', async () => {
      pedidosRepository.find.mockResolvedValue([]);

      await service.findAll({
        dataInicio: '2026-07-01',
        dataFim: '2026-07-31',
      } as FindOrdersQueryDto);

      const opcoes = pedidosRepository.find.mock.calls[0][0];
      const where = opcoes?.where as FindOptionsWhere<Pedido>;
      expect(where.data).toEqual(
        Between(
          new Date('2026-07-01T00:00:00.000Z'),
          new Date('2026-07-31T23:59:59.999Z'),
        ),
      );
    });

    // Só dataInicio: filtro vira "a partir de" (MoreThanOrEqual).
    it('filtra apenas por dataInicio', async () => {
      pedidosRepository.find.mockResolvedValue([]);

      await service.findAll({
        dataInicio: '2026-07-01',
      } as FindOrdersQueryDto);

      const opcoes = pedidosRepository.find.mock.calls[0][0];
      const where = opcoes?.where as FindOptionsWhere<Pedido>;
      expect(where.data).toEqual(
        MoreThanOrEqual(new Date('2026-07-01T00:00:00.000Z')),
      );
    });

    // Só dataFim: filtro vira "até" (LessThanOrEqual).
    it('filtra apenas por dataFim', async () => {
      pedidosRepository.find.mockResolvedValue([]);

      await service.findAll({ dataFim: '2026-07-31' } as FindOrdersQueryDto);

      const opcoes = pedidosRepository.find.mock.calls[0][0];
      const where = opcoes?.where as FindOptionsWhere<Pedido>;
      expect(where.data).toEqual(
        LessThanOrEqual(new Date('2026-07-31T23:59:59.999Z')),
      );
    });
  });

  // Busca interna por id (usada por outros métodos do service, ex.: após criar/atualizar).
  describe('findOne', () => {
    it('lança NotFoundException quando o pedido não existe', async () => {
      pedidosRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });

    it('retorna o pedido quando encontrado', async () => {
      const pedido = { id: 1 } as Pedido;
      pedidosRepository.findOne.mockResolvedValue(pedido);

      await expect(service.findOne(1)).resolves.toBe(pedido);
    });
  });

  // Busca por id respeitando dono do pedido: usada na rota GET /orders/:id.
  describe('findOneForUser', () => {
    const pedido = { id: 1, cliente: { id: 10 } } as Pedido;

    it('permite que um ADMIN acesse pedido de outro cliente', async () => {
      pedidosRepository.findOne.mockResolvedValue(pedido);
      const admin = { id: 999, role: Role.ADMIN } as Cliente;

      await expect(service.findOneForUser(1, admin)).resolves.toBe(pedido);
    });

    it('permite que o próprio cliente acesse seu pedido', async () => {
      pedidosRepository.findOne.mockResolvedValue(pedido);
      const cliente = { id: 10, role: Role.CLIENTE } as Cliente;

      await expect(service.findOneForUser(1, cliente)).resolves.toBe(pedido);
    });

    // Um CLIENTE não pode ver pedidos que não são dele.
    it('lança ForbiddenException quando o cliente tenta acessar pedido de outro', async () => {
      pedidosRepository.findOne.mockResolvedValue(pedido);
      const outroCliente = { id: 20, role: Role.CLIENTE } as Cliente;

      await expect(service.findOneForUser(1, outroCliente)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // Busca pública pelo token de rastreio (link enviado por e-mail, sem exigir login).
  describe('findOneByTrackingToken', () => {
    it('lança NotFoundException quando o token não corresponde a nenhum pedido', async () => {
      pedidosRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOneByTrackingToken('token-invalido'),
      ).rejects.toThrow(NotFoundException);
    });

    it('retorna o pedido correspondente ao token', async () => {
      const pedido = { id: 1, trackingToken: 'abc' } as Pedido;
      pedidosRepository.findOne.mockResolvedValue(pedido);

      await expect(service.findOneByTrackingToken('abc')).resolves.toBe(pedido);
    });
  });

  // Atualização de status: grava histórico, envia e-mail, notifica via WebSocket e
  // repõe estoque quando o pedido é cancelado.
  describe('updateStatus', () => {
    const produtoItem = { produto: { id: 1 }, quantidade: 3 };

    function buildPedido(statusNome: string) {
      return {
        id: 1,
        status: { id: 1, nome: statusNome },
        itens: [produtoItem],
      } as unknown as Pedido;
    }

    it('lança BadRequestException quando o status informado é inválido', async () => {
      pedidosRepository.findOne.mockResolvedValue(buildPedido('pendente'));
      statusRepository.findOneBy.mockResolvedValue(null);

      const dto: UpdateOrderStatusDto = { statusId: 999 };
      await expect(service.updateStatus(1, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    // Fluxo normal (sem cancelamento): não deve mexer no estoque.
    it('atualiza o status, salva o histórico, envia e-mail e notifica via gateway', async () => {
      const pedido = buildPedido('pendente');
      const novoStatus = { id: 2, nome: 'em preparo' } as Status;
      pedidosRepository.findOne
        .mockResolvedValueOnce(pedido)
        .mockResolvedValueOnce({ ...pedido, status: novoStatus });
      statusRepository.findOneBy.mockResolvedValue(novoStatus);
      const { manager } = buildTransactionManager();
      pedidosRepository.manager.transaction.mockImplementation((cb) =>
        cb(manager as unknown as EntityManager),
      );

      const dto: UpdateOrderStatusDto = { statusId: 2 };
      const resultado = await service.updateStatus(1, dto);

      expect(manager.increment).not.toHaveBeenCalled();
      expect(mailService.sendOrderStatusUpdated).toHaveBeenCalled();
      expect(ordersGateway.emitStatusAtualizado).toHaveBeenCalled();
      expect(resultado.status).toBe(novoStatus);
    });

    // Cancelamento devolve ao estoque a quantidade reservada por cada item do pedido.
    it('repõe o estoque dos itens ao cancelar um pedido não cancelado', async () => {
      const pedido = buildPedido('pendente');
      const statusCancelado = { id: 4, nome: 'cancelado' } as Status;
      pedidosRepository.findOne
        .mockResolvedValueOnce(pedido)
        .mockResolvedValueOnce({ ...pedido, status: statusCancelado });
      statusRepository.findOneBy.mockResolvedValue(statusCancelado);
      const { manager } = buildTransactionManager();
      pedidosRepository.manager.transaction.mockImplementation((cb) =>
        cb(manager as unknown as EntityManager),
      );

      const dto: UpdateOrderStatusDto = { statusId: 4 };
      await service.updateStatus(1, dto);

      expect(manager.increment).toHaveBeenCalledWith(
        Produto,
        { id: produtoItem.produto.id },
        'estoque',
        produtoItem.quantidade,
      );
    });

    // Idempotência: se o pedido já estava cancelado, não repõe o estoque de novo
    // (evita duplicar a devolução ao "reenviar" o mesmo status).
    it('não repõe o estoque quando o pedido já estava cancelado', async () => {
      const pedido = buildPedido('cancelado');
      const statusCancelado = { id: 4, nome: 'cancelado' } as Status;
      pedidosRepository.findOne
        .mockResolvedValueOnce(pedido)
        .mockResolvedValueOnce({ ...pedido, status: statusCancelado });
      statusRepository.findOneBy.mockResolvedValue(statusCancelado);
      const { manager } = buildTransactionManager();
      pedidosRepository.manager.transaction.mockImplementation((cb) =>
        cb(manager as unknown as EntityManager),
      );

      const dto: UpdateOrderStatusDto = { statusId: 4 };
      await service.updateStatus(1, dto);

      expect(manager.increment).not.toHaveBeenCalled();
    });
  });

  // Lista de status usada pelo GET /orders-status (para popular filtros/telas).
  describe('findAllStatuses', () => {
    it('retorna a lista de status ordenada por id', async () => {
      const statuses = [{ id: 1, nome: 'pendente' }] as Status[];
      statusRepository.find.mockResolvedValue(statuses);

      const resultado = await service.findAllStatuses();

      expect(statusRepository.find).toHaveBeenCalledWith({
        order: { id: 'ASC' },
      });
      expect(resultado).toBe(statuses);
    });
  });
});
