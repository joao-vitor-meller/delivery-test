import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSenhaToClientes1783554477442 implements MigrationInterface {
  name = 'AddSenhaToClientes1783554477442';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE clientes ADD COLUMN senha VARCHAR(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE clientes DROP COLUMN senha
    `);
  }
}
