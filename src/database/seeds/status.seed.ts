import { DataSource } from 'typeorm';

export const STATUS_SEED = [
  'pendente',
  'confirmado',
  'em_preparo',
  'saiu_para_entrega',
  'pronto_para_retirada',
  'entregue',
  'cancelado',
];

export async function seedStatus(dataSource: DataSource): Promise<void> {
  await dataSource.query(
    `INSERT INTO status (nome)
     SELECT * FROM UNNEST($1::varchar[])
     ON CONFLICT (nome) DO NOTHING`,
    [STATUS_SEED],
  );
}
