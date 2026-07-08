import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Pedido } from './pedido.entity';
import { Produto } from './produto.entity';

@Entity('pedido_itens')
export class PedidoItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index('idx_pedido_itens_pedido_id')
  @ManyToOne(() => Pedido, (pedido) => pedido.itens, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'pedido_id' })
  pedido!: Pedido;

  @Index('idx_pedido_itens_produto_id')
  @ManyToOne(() => Produto, (produto) => produto.itens, { nullable: false })
  @JoinColumn({ name: 'produto_id' })
  produto!: Produto;

  @Column({ type: 'int', default: 1 })
  quantidade!: number;

  @Column({ name: 'preco_unitario', type: 'numeric', precision: 10, scale: 2 })
  precoUnitario!: string;
}
