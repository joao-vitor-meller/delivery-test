import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeliverySchema1783536348775 implements MigrationInterface {
  name = 'CreateDeliverySchema1783536348775';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE clientes (
          id SERIAL PRIMARY KEY,
          nome VARCHAR(150) NOT NULL,
          email VARCHAR(150) UNIQUE NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE produtos (
          id SERIAL PRIMARY KEY,
          nome VARCHAR(150) NOT NULL,
          preco NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
          criado_em TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE status (
          id SERIAL PRIMARY KEY,
          nome VARCHAR(50) UNIQUE NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE pedidos (
          id SERIAL PRIMARY KEY,
          cliente_id INTEGER NOT NULL REFERENCES clientes(id),
          valor_total NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (valor_total >= 0),
          data TIMESTAMP NOT NULL DEFAULT NOW(),
          status_id INTEGER NOT NULL REFERENCES status(id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE pedido_itens (
          id SERIAL PRIMARY KEY,
          pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
          produto_id INTEGER NOT NULL REFERENCES produtos(id),
          quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
          preco_unitario NUMERIC(10,2) NOT NULL CHECK (preco_unitario >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE pedido_status_historico (
          id SERIAL PRIMARY KEY,
          pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
          status_id INTEGER NOT NULL REFERENCES status(id),
          alterado_em TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_pedidos_cliente_id ON pedidos(cliente_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_pedidos_status_id ON pedidos(status_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_pedido_itens_pedido_id ON pedido_itens(pedido_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_pedido_itens_produto_id ON pedido_itens(produto_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_pedido_status_historico_pedido_id ON pedido_status_historico(pedido_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS pedido_status_historico`);
    await queryRunner.query(`DROP TABLE IF EXISTS pedido_itens`);
    await queryRunner.query(`DROP TABLE IF EXISTS pedidos`);
    await queryRunner.query(`DROP TABLE IF EXISTS status`);
    await queryRunner.query(`DROP TABLE IF EXISTS produtos`);
    await queryRunner.query(`DROP TABLE IF EXISTS clientes`);
  }
}
