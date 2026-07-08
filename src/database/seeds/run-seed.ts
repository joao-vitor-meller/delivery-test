import { AppDataSource } from '../data-source';
import { seedStatus } from './status.seed';

async function run(): Promise<void> {
  await AppDataSource.initialize();
  await seedStatus(AppDataSource);
  await AppDataSource.destroy();
  console.log('Seed concluído.');
}

run().catch((error) => {
  console.error('Erro ao rodar o seed:', error);
  process.exit(1);
});
