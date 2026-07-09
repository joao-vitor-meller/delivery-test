import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersGateway } from './orders.gateway';
import { Pedido } from '../database/entities/pedido.entity';
import { Produto } from '../database/entities/produto.entity';
import { Status } from '../database/entities/status.entity';
import { MailService } from '../mail/mail.service';

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  findBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  manager: { transaction: jest.fn() },
});

const mockMailService = () => ({
  sendOrderCreated: jest.fn(),
  sendOrderStatusUpdated: jest.fn(),
});

const mockOrdersGateway = () => ({
  emitStatusAtualizado: jest.fn(),
});

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Pedido), useFactory: mockRepository },
        { provide: getRepositoryToken(Produto), useFactory: mockRepository },
        { provide: getRepositoryToken(Status), useFactory: mockRepository },
        { provide: MailService, useFactory: mockMailService },
        { provide: OrdersGateway, useFactory: mockOrdersGateway },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
