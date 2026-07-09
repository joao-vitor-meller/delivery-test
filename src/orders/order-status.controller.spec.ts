import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { OrderStatusController } from './order-status.controller';
import { Status } from '../database/entities/status.entity';

function mockOrdersService() {
  return {
    findAllStatuses: jest.fn<Status[], []>(),
  };
}

describe('OrderStatusController', () => {
  let controller: OrderStatusController;
  let ordersService: ReturnType<typeof mockOrdersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderStatusController],
      providers: [{ provide: OrdersService, useFactory: mockOrdersService }],
    }).compile();

    controller = module.get<OrderStatusController>(OrderStatusController);
    ordersService =
      module.get<ReturnType<typeof mockOrdersService>>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // GET /orders-status
  describe('findAll', () => {
    it('delega a listagem de status ao service', () => {
      const statuses = [{ id: 1, nome: 'pendente' }] as Status[];
      ordersService.findAllStatuses.mockReturnValue(statuses);

      const resultado = controller.findAll();

      expect(ordersService.findAllStatuses).toHaveBeenCalled();
      expect(resultado).toBe(statuses);
    });
  });
});
