import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Cliente } from '../database/entities/cliente.entity';
import { Auth } from '../auth/decorators/auth.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Clients')
@Auth(Role.ADMIN)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiOperation({
    summary:
      'Cria um novo cliente. A senha é opcional; se informada, o cliente poderá autenticar via /auth/login (ADMIN)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Cliente criado com sucesso',
    type: Cliente,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'E-mail já está em uso',
  })
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista todos os clientes (ADMIN)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de clientes',
    type: [Cliente],
  })
  findAll() {
    return this.clientsService.findAll();
  }

  @ApiExcludeEndpoint()
  @Get(':id')
  @ApiOperation({ summary: 'Busca um cliente pelo id (ADMIN)' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Identificador do cliente',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cliente encontrado',
    type: Cliente,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Cliente não encontrado',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientsService.findOne(id);
  }

  @ApiExcludeEndpoint()
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um cliente existente (ADMIN)' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Identificador do cliente',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cliente atualizado com sucesso',
    type: Cliente,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Cliente não encontrado',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    return this.clientsService.update(id, updateClientDto);
  }
}
