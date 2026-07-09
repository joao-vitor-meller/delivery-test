import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function seedAdmin(dataSource: DataSource): Promise<void> {
  const nome = process.env.ADMIN_NAME || 'Administrador';
  const email = process.env.ADMIN_EMAIL || 'admin@delivery.com';
  const senha = process.env.ADMIN_PASSWORD || 'admin123';
  const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

  await dataSource.query(
    `INSERT INTO clientes (nome, email, senha, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO NOTHING`,
    [nome, email, senhaHash],
  );
}
