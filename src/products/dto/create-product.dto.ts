import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
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
}
