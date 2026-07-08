import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Pedido } from './pedido.entity';
import { PedidoStatusHistorico } from './pedido-status-historico.entity';

@Entity('status')
export class Status {
  @ApiProperty({ description: 'Identificador do status', example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ description: 'Nome do status', example: 'pendente' })
  @Column({ length: 50, unique: true })
  nome!: string;

  @OneToMany(() => Pedido, (pedido) => pedido.status)
  pedidos!: Pedido[];

  @OneToMany(() => PedidoStatusHistorico, (historico) => historico.status)
  historico!: PedidoStatusHistorico[];
}
