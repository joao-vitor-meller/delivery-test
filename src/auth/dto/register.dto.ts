import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Nome de usuário',
    minLength: 1,
    maxLength: 150,
    example: 'Admin',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  nome!: string;

  @ApiProperty({
    description: 'E-mail',
    maxLength: 150,
    example: 'admin@delivery.com',
  })
  @IsEmail()
  @MaxLength(150)
  email!: string;

  @ApiProperty({
    description: 'Senha',
    minLength: 6,
    maxLength: 255,
    example: 'admin123',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(255)
  senha!: string;
}
