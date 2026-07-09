import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEstoqueToProdutos1783554700000 implements MigrationInterface {
  name = 'AddEstoqueToProdutos1783554700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE produtos ADD COLUMN estoque integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE produtos DROP COLUMN estoque
    `);
  }
}
