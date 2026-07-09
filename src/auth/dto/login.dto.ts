import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'E-mail',
    example: 'admin@delivery.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Senha',
    example: 'admin123',
  })
  @IsString()
  senha!: string;
}
