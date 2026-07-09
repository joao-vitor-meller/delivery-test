import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrackingTokenToPedidos1783554800000
  implements MigrationInterface
{
  name = 'AddTrackingTokenToPedidos1783554800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE pedidos ADD COLUMN tracking_token uuid NOT NULL DEFAULT gen_random_uuid()
    `);
    await queryRunner.query(`
      ALTER TABLE pedidos ADD CONSTRAINT uq_pedidos_tracking_token UNIQUE (tracking_token)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE pedidos DROP CONSTRAINT uq_pedidos_tracking_token
    `);
    await queryRunner.query(`
      ALTER TABLE pedidos DROP COLUMN tracking_token
    `);
  }
}
