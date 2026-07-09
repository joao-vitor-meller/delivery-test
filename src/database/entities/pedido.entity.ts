import {
  Column,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cliente } from './cliente.entity';
import { Status } from './status.entity';
import { PedidoItem } from './pedido-item.entity';
import { PedidoStatusHistorico } from './pedido-status-historico.entity';

@Entity('pedidos')
export class Pedido {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'tracking_token', type: 'uuid', unique: true })
  @Generated('uuid')
  trackingToken!: string;

  @Index('idx_pedidos_cliente_id')
  @ManyToOne(() => Cliente, (cliente) => cliente.pedidos, { nullable: false })
  @JoinColumn({ name: 'cliente_id' })
  cliente!: Cliente;

  @Column({
    name: 'valor_total',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
  })
  valorTotal!: string;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  data!: Date;

  @Index('idx_pedidos_status_id')
  @ManyToOne(() => Status, (status) => status.pedidos, { nullable: false })
  @JoinColumn({ name: 'status_id' })
  status!: Status;

  @OneToMany(() => PedidoItem, (item) => item.pedido)
  itens!: PedidoItem[];

  @OneToMany(() => PedidoStatusHistorico, (historico) => historico.pedido)
  historico!: PedidoStatusHistorico[];
}
