import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateOrderClienteDto {
  @ApiProperty({
    description:
      'Nome do cliente. Obrigatório apenas quando ainda não existe um ' +
      'cliente cadastrado com o e-mail informado; se informado para um ' +
      'cliente já existente, atualiza o nome cadastrado.',
    minLength: 1,
    maxLength: 150,
    required: false,
    example: 'João da Silva',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  nome?: string;

  @ApiProperty({
    description:
      'E-mail do cliente, usado para identificar um cliente já cadastrado',
    maxLength: 150,
    example: 'joao.silva@email.com',
  })
  @IsEmail()
  @MaxLength(150)
  email!: string;
}

export class CreateOrderItemDto {
  @ApiProperty({ description: 'Identificador do produto', example: 1 })
  @IsInt()
  @IsPositive()
  produtoId!: number;

  @ApiProperty({
    description: 'Quantidade do produto',
    minimum: 1,
    example: 2,
  })
  @IsInt()
  @IsPositive()
  quantidade!: number;
}

export class CreateOrderDto {
  @ApiProperty({
    description:
      'Dados do cliente que está fazendo o pedido. Se já existir um cliente ' +
      'cadastrado com esse e-mail, o pedido é associado a ele; caso ' +
      'contrário, um novo cliente é cadastrado automaticamente.',
    type: CreateOrderClienteDto,
  })
  @ValidateNested()
  @Type(() => CreateOrderClienteDto)
  cliente!: CreateOrderClienteDto;

  @ApiProperty({
    description: 'Itens do pedido',
    type: [CreateOrderItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  itens!: CreateOrderItemDto[];
}
