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
import { TipoEntrega } from '../../common/enums/tipo-entrega.enum';

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

  @Column({
    name: 'tipo_entrega',
    type: 'enum',
    enum: TipoEntrega,
    enumName: 'pedidos_tipo_entrega_enum',
    default: TipoEntrega.ENTREGA,
  })
  tipoEntrega!: TipoEntrega;

  @Column({
    name: 'endereco_rua',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  enderecoRua?: string | null;

  @Column({
    name: 'endereco_numero',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  enderecoNumero?: string | null;

  @Column({
    name: 'endereco_complemento',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  enderecoComplemento?: string | null;

  @Column({
    name: 'endereco_bairro',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  enderecoBairro?: string | null;

  @Column({
    name: 'endereco_cidade',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  enderecoCidade?: string | null;

  @Column({ name: 'endereco_cep', type: 'varchar', length: 9, nullable: true })
  enderecoCep?: string | null;

  @OneToMany(() => PedidoItem, (item) => item.pedido)
  itens!: PedidoItem[];

  @OneToMany(() => PedidoStatusHistorico, (historico) => historico.pedido)
  historico!: PedidoStatusHistorico[];
}
