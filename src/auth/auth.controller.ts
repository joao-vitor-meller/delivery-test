import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Auth } from './decorators/auth.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Cliente } from '../database/entities/cliente.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registra um novo cliente e retorna um token JWT',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Cliente registrado com sucesso',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'E-mail já está em uso',
  })
  register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Autentica um cliente e retorna um token JWT',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Autenticado com sucesso',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Credenciais inválidas',
  })
  login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @Auth()
  @ApiOperation({
    summary: 'Retorna os dados do cliente autenticado (ADMIN/CLIENTE)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dados do cliente autenticado',
    type: Cliente,
  })
  me(@CurrentUser() cliente: Cliente): Cliente {
    return cliente;
  }
}
