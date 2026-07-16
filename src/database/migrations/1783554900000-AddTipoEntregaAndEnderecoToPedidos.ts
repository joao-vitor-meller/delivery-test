import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTipoEntregaAndEnderecoToPedidos1783554900000 implements MigrationInterface {
  name = 'AddTipoEntregaAndEnderecoToPedidos1783554900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE pedidos_tipo_entrega_enum AS ENUM ('entrega', 'retirada')
    `);
    await queryRunner.query(`
      ALTER TABLE pedidos ADD COLUMN tipo_entrega pedidos_tipo_entrega_enum NOT NULL DEFAULT 'entrega'
    `);
    await queryRunner.query(`
      ALTER TABLE pedidos ADD COLUMN endereco_rua varchar(200)
    `);
    await queryRunner.query(`
      ALTER TABLE pedidos ADD COLUMN endereco_numero varchar(20)
    `);
    await queryRunner.query(`
      ALTER TABLE pedidos ADD COLUMN endereco_complemento varchar(100)
    `);
    await queryRunner.query(`
      ALTER TABLE pedidos ADD COLUMN endereco_bairro varchar(100)
    `);
    await queryRunner.query(`
      ALTER TABLE pedidos ADD COLUMN endereco_cidade varchar(100)
    `);
    await queryRunner.query(`
      ALTER TABLE pedidos ADD COLUMN endereco_cep varchar(9)
    `);
    await queryRunner.query(`
      INSERT INTO status (nome) VALUES ('pronto_para_retirada')
      ON CONFLICT (nome) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM status WHERE nome = 'pronto_para_retirada'
    `);
    await queryRunner.query(`
      ALTER TABLE pedidos DROP COLUMN endereco_cep
    `);
    await queryRunner.query(`
      ALTER TABLE pedidos DROP COLUMN endereco_cidade
    `);
    await queryRunner.query(`
      ALTER TABLE pedidos DROP COLUMN endereco_bairro
    `);
    await queryRunner.query(`
      ALTER TABLE pedidos DROP COLUMN endereco_complemento
    `);
    await queryRunner.query(`
      ALTER TABLE pedidos DROP COLUMN endereco_numero
    `);
    await queryRunner.query(`
      ALTER TABLE pedidos DROP COLUMN endereco_rua
    `);
    await queryRunner.query(`
      ALTER TABLE pedidos DROP COLUMN tipo_entrega
    `);
    await queryRunner.query(`
      DROP TYPE pedidos_tipo_entrega_enum
    `);
  }
}
