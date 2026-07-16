import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { TipoEntrega } from '../../common/enums/tipo-entrega.enum';

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

export class CreateOrderEnderecoDto {
  @ApiProperty({
    description: 'Rua/avenida',
    maxLength: 200,
    example: 'Rua das Flores',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  rua!: string;

  @ApiProperty({ description: 'Número', maxLength: 20, example: '123' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  numero!: string;

  @ApiProperty({
    description: 'Complemento (opcional)',
    maxLength: 100,
    required: false,
    example: 'Apto 45',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  complemento?: string;

  @ApiProperty({ description: 'Bairro', maxLength: 100, example: 'Centro' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  bairro!: string;

  @ApiProperty({
    description: 'Cidade',
    maxLength: 100,
    example: 'Santa Maria',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  cidade!: string;

  @ApiProperty({ description: 'CEP', maxLength: 9, example: '97000-000' })
  @IsString()
  @MinLength(1)
  @MaxLength(9)
  cep!: string;
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

  @ApiProperty({
    description:
      'Tipo de entrega do pedido: "entrega" (padrão, exige endereço) ou ' +
      '"retirada" (retirada na loja, sem necessidade de endereço)',
    enum: TipoEntrega,
    required: false,
    default: TipoEntrega.ENTREGA,
    example: TipoEntrega.ENTREGA,
  })
  @IsOptional()
  @IsEnum(TipoEntrega)
  tipoEntrega!: TipoEntrega;

  @ApiProperty({
    description:
      'Endereço de entrega. Obrigatório quando tipoEntrega for "entrega" ' +
      '(ou omitido); ignorado quando for "retirada".',
    type: CreateOrderEnderecoDto,
    required: false,
  })
  @ValidateIf(
    (dto: CreateOrderDto) =>
      !dto.tipoEntrega || dto.tipoEntrega === TipoEntrega.ENTREGA,
  )
  @ValidateNested()
  @Type(() => CreateOrderEnderecoDto)
  endereco?: CreateOrderEnderecoDto;
}
