import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsPositive } from 'class-validator';

export class FindOrdersQueryDto {
  @ApiPropertyOptional({
    description:
      'Filtra pedidos pelo identificador do status (ver GET /orders-status)',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  statusId!: number;

  @ApiPropertyOptional({
    description: 'Filtra pedidos pelo identificador do cliente',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  clienteId?: number;

  @ApiPropertyOptional({
    description: 'Data inicial do período (inclusive), formato ISO 8601',
    example: '2026-07-01',
  })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional({
    description: 'Data final do período (inclusive), formato ISO 8601',
    example: '2026-07-31',
  })
  @IsOptional()
  @IsDateString()
  dataFim?: string;
}
