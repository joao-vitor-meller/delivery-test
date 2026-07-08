import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Pedido } from './pedido.entity';
import { Status } from './status.entity';

@Entity('pedido_status_historico')
export class PedidoStatusHistorico {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index('idx_pedido_status_historico_pedido_id')
  @ManyToOne(() => Pedido, (pedido) => pedido.historico, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'pedido_id' })
  pedido!: Pedido;

  @ManyToOne(() => Status, (status) => status.historico, { nullable: false })
  @JoinColumn({ name: 'status_id' })
  status!: Status;

  @Column({ name: 'alterado_em', type: 'timestamp', default: () => 'NOW()' })
  alteradoEm!: Date;
}
