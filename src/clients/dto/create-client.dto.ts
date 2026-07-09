import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateClientDto {
  @ApiProperty({
    description: 'Nome do cliente',
    minLength: 1,
    maxLength: 150,
    example: 'João da Silva',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  nome!: string;

  @ApiProperty({
    description: 'E-mail do cliente',
    maxLength: 150,
    example: 'joao.silva@email.com',
  })
  @IsEmail()
  @MaxLength(150)
  email!: string;

  @ApiPropertyOptional({
    description:
      'Senha do cliente. Se informada, permite login via /auth/login',
    minLength: 6,
    maxLength: 255,
    example: 'senhaForte123',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(255)
  senha?: string;
}
