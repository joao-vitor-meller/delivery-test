import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Pedido } from '../database/entities/pedido.entity';
import { Cliente } from '../database/entities/cliente.entity';
import { Role } from '../common/enums/role.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { FindOrdersQueryDto } from './dto/find-orders-query.dto';
import { FindMyOrdersQueryDto } from './dto/find-my-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

function mockOrdersService() {
  return {
    create: jest.fn<Pedido, [CreateOrderDto]>(),
    findAll: jest.fn<Pedido[], [FindOrdersQueryDto]>(),
    findOneForUser: jest.fn<Pedido, [number, Cliente]>(),
    findOneByTrackingToken: jest.fn<Pedido, [string]>(),
    updateStatus: jest.fn<Pedido, [number, UpdateOrderStatusDto]>(),
  };
}

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: ReturnType<typeof mockOrdersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useFactory: mockOrdersService }],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    ordersService =
      module.get<ReturnType<typeof mockOrdersService>>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // POST /orders
  describe('create', () => {
    // O controller não deve conter lógica própria: apenas repassa o DTO ao service.
    it('delega a criação do pedido ao service', () => {
      const dto: CreateOrderDto = {
        cliente: { nome: 'João', email: 'joao@email.com' },
        itens: [{ produtoId: 1, quantidade: 1 }],
      };
      const pedidoCriado = { id: 1 } as Pedido;
      ordersService.create.mockReturnValue(pedidoCriado);

      const resultado = controller.create(dto);

      expect(ordersService.create).toHaveBeenCalledWith(dto);
      expect(resultado).toBe(pedidoCriado);
    });
  });

  // GET /orders (rota de ADMIN, lista todos os pedidos)
  describe('findAll', () => {
    // Os filtros vindos na query string devem chegar intactos ao service.
    it('delega a listagem de pedidos ao service com os filtros da query', () => {
      const query = { statusId: 1 } as FindOrdersQueryDto;
      const pedidos = [{ id: 1 } as Pedido];
      ordersService.findAll.mockReturnValue(pedidos);

      const resultado = controller.findAll(query);

      expect(ordersService.findAll).toHaveBeenCalledWith(query);
      expect(resultado).toBe(pedidos);
    });
  });

  // GET /orders/me (o próprio cliente vê apenas seus pedidos)
  describe('findMine', () => {
    // O clienteId do usuário logado deve ser injetado na query antes de chamar o service,
    // impedindo que o cliente veja pedidos de outra pessoa.
    it('lista os pedidos do cliente autenticado, incluindo o clienteId na busca', () => {
      const cliente = { id: 7, role: Role.CLIENTE } as Cliente;
      const query = { statusId: 2 } as FindMyOrdersQueryDto;
      const pedidos = [{ id: 1 } as Pedido];
      ordersService.findAll.mockReturnValue(pedidos);

      const resultado = controller.findMine(cliente, query);

      expect(ordersService.findAll).toHaveBeenCalledWith({
        statusId: 2,
        clienteId: 7,
      });
      expect(resultado).toBe(pedidos);
    });
  });

  // GET /orders/track/:token (link público de acompanhamento, sem login)
  describe('findByTrackingToken', () => {
    it('delega a busca por token de rastreio ao service', () => {
      const pedido = { id: 1, trackingToken: 'abc' } as Pedido;
      ordersService.findOneByTrackingToken.mockReturnValue(pedido);

      const resultado = controller.findByTrackingToken('abc');

      expect(ordersService.findOneByTrackingToken).toHaveBeenCalledWith('abc');
      expect(resultado).toBe(pedido);
    });
  });

  // GET /orders/:id (ADMIN vê qualquer pedido; CLIENTE só os próprios — regra fica no service)
  describe('findOne', () => {
    it('delega a busca do pedido por id ao service, considerando o usuário autenticado', () => {
      const cliente = { id: 7, role: Role.CLIENTE } as Cliente;
      const pedido = { id: 1 } as Pedido;
      ordersService.findOneForUser.mockReturnValue(pedido);

      const resultado = controller.findOne(1, cliente);

      expect(ordersService.findOneForUser).toHaveBeenCalledWith(1, cliente);
      expect(resultado).toBe(pedido);
    });
  });

  // PATCH /orders/:id/status (ADMIN)
  describe('updateStatus', () => {
    it('delega a atualização de status ao service', () => {
      const dto: UpdateOrderStatusDto = { statusId: 2 };
      const pedidoAtualizado = { id: 1, status: { id: 2 } } as Pedido;
      ordersService.updateStatus.mockReturnValue(pedidoAtualizado);

      const resultado = controller.updateStatus(1, dto);

      expect(ordersService.updateStatus).toHaveBeenCalledWith(1, dto);
      expect(resultado).toBe(pedidoAtualizado);
    });
  });
});
