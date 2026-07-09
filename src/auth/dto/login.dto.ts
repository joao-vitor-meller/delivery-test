import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'E-mail do cliente',
    example: 'joao.silva@email.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Senha do cliente',
    example: 'senhaForte123',
  })
  @IsString()
  senha!: string;
}
