import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Cliente } from '../database/entities/cliente.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

const POSTGRES_UNIQUE_VIOLATION = '23505';
const SALT_ROUNDS = 10;

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clientsRepository: Repository<Cliente>,
  ) {}

  async create(createClientDto: CreateClientDto): Promise<Cliente> {
    const cliente = this.clientsRepository.create({
      nome: createClientDto.nome,
      email: createClientDto.email,
      senha: createClientDto.senha
        ? await bcrypt.hash(createClientDto.senha, SALT_ROUNDS)
        : null,
    });

    try {
      return await this.clientsRepository.save(cliente);
    } catch (error) {
      this.handleUniqueEmailViolation(error, createClientDto.email);
      throw error;
    }
  }

  findAll(): Promise<Cliente[]> {
    return this.clientsRepository.find();
  }

  async findOne(id: number): Promise<Cliente> {
    const cliente = await this.clientsRepository.findOneBy({ id });
    if (!cliente) {
      throw new NotFoundException(`Cliente #${id} não encontrado`);
    }
    return cliente;
  }

  async update(id: number, updateClientDto: UpdateClientDto): Promise<Cliente> {
    const cliente = await this.findOne(id);

    if (updateClientDto.nome !== undefined) {
      cliente.nome = updateClientDto.nome;
    }
    if (updateClientDto.email !== undefined) {
      cliente.email = updateClientDto.email;
    }
    if (updateClientDto.senha !== undefined) {
      cliente.senha = await bcrypt.hash(updateClientDto.senha, SALT_ROUNDS);
    }

    try {
      return await this.clientsRepository.save(cliente);
    } catch (error) {
      this.handleUniqueEmailViolation(error, cliente.email);
      throw error;
    }
  }

  private handleUniqueEmailViolation(error: unknown, email: string): void {
    if (
      error instanceof QueryFailedError &&
      (error as unknown as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION
    ) {
      throw new ConflictException(`E-mail "${email}" já está em uso`);
    }
  }
}
