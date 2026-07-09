import { AppDataSource } from '../data-source';
import { seedStatus } from './status.seed';
import { seedAdmin } from './admin.seed';

async function run(): Promise<void> {
  await AppDataSource.initialize();
  await seedStatus(AppDataSource);
  await seedAdmin(AppDataSource);
  await AppDataSource.destroy();
  console.log('Seed concluído.');
}

run().catch((error) => {
  console.error('Erro ao rodar o seed:', error);
  process.exit(1);
});
