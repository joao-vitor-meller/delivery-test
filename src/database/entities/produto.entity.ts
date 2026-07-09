import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PedidoItem } from './pedido-item.entity';

@Entity('produtos')
export class Produto {
  @ApiProperty({ description: 'Identificador do produto', example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ description: 'Nome do produto', example: 'Pizza Calabresa' })
  @Column({ length: 150 })
  nome!: string;

  // numeric vem como string do driver pg para não perder precisão
  @ApiProperty({ description: 'Preço do produto', example: '39.90' })
  @Column({ type: 'numeric', precision: 10, scale: 2 })
  preco!: string;

  @ApiProperty({ description: 'Data de criação do produto' })
  @Column({ name: 'criado_em', type: 'timestamp', default: () => 'NOW()' })
  criadoEm!: Date;

  @ApiProperty({ description: 'Quantidade em estoque', example: 25 })
  @Column({ type: 'int', default: 0 })
  estoque!: number;

  @OneToMany(() => PedidoItem, (item) => item.produto)
  itens!: PedidoItem[];
}
