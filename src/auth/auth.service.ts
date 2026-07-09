import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { QueryFailedError, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Cliente } from '../database/entities/cliente.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const POSTGRES_UNIQUE_VIOLATION = '23505';
const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Cliente)
    private readonly clientesRepository: Repository<Cliente>,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ accessToken: string }> {
    const existente = await this.clientesRepository.findOne({
      where: { email: registerDto.email },
      select: { id: true, email: true, nome: true, senha: true, role: true },
    });

    if (existente) {
      if (existente.senha) {
        throw new ConflictException(
          `E-mail "${registerDto.email}" já está em uso`,
        );
      }

      existente.nome = registerDto.nome;
      existente.senha = await bcrypt.hash(registerDto.senha, SALT_ROUNDS);
      const cliente = await this.clientesRepository.save(existente);
      return this.signToken(cliente);
    }

    const senhaHash = await bcrypt.hash(registerDto.senha, SALT_ROUNDS);

    const cliente = this.clientesRepository.create({
      nome: registerDto.nome,
      email: registerDto.email,
      senha: senhaHash,
    });

    try {
      await this.clientesRepository.save(cliente);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as unknown as { code?: string }).code ===
          POSTGRES_UNIQUE_VIOLATION
      ) {
        throw new ConflictException(
          `E-mail "${registerDto.email}" já está em uso`,
        );
      }
      throw error;
    }

    return this.signToken(cliente);
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string }> {
    const cliente = await this.clientesRepository.findOne({
      where: { email: loginDto.email },
      select: { id: true, email: true, senha: true },
    });

    if (!cliente?.senha) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const senhaValida = await bcrypt.compare(loginDto.senha, cliente.senha);
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.signToken(cliente);
  }

  private signToken(cliente: Cliente): { accessToken: string } {
    const payload: JwtPayload = { sub: cliente.id, email: cliente.email };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
