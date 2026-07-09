import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoleToClientes1783554600000 implements MigrationInterface {
  name = 'AddRoleToClientes1783554600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE clientes_role_enum AS ENUM ('admin', 'cliente')
    `);
    await queryRunner.query(`
      ALTER TABLE clientes ADD COLUMN role clientes_role_enum NOT NULL DEFAULT 'cliente'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE clientes DROP COLUMN role
    `);
    await queryRunner.query(`
      DROP TYPE clientes_role_enum
    `);
  }
}
