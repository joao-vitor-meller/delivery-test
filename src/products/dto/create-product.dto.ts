import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'Nome do produto',
    minLength: 1,
    maxLength: 150,
    example: 'Pizza Calabresa',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  nome!: string;

  @ApiProperty({
    description: 'Preço do produto',
    example: 39.99,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  preco!: number;

  @ApiProperty({
    description: 'Quantidade em estoque',
    example: 25,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  estoque?: number;
}
