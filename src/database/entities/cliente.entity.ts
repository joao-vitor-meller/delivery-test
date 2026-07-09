import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Pedido } from './pedido.entity';
import { Role } from '../../common/enums/role.enum';

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 150 })
  nome!: string;

  @Column({ length: 150, unique: true })
  email!: string;

  @Exclude({ toPlainOnly: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  senha?: string | null;

  @Column({
    type: 'enum',
    enum: Role,
    enumName: 'clientes_role_enum',
    default: Role.CLIENTE,
  })
  role!: Role;

  @OneToMany(() => Pedido, (pedido) => pedido.cliente)
  pedidos!: Pedido[];
}
