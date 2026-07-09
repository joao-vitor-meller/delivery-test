import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({ description: 'Token de acesso JWT' })
  accessToken!: string;
}
