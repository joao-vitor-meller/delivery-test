import { Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { seedStatus } from './seeds/status.seed';
import { seedAdmin } from './seeds/admin.seed';

@Module({})
export class DatabaseSeedModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSeedModule.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    await seedStatus(this.dataSource);
    this.logger.log('Seed de status verificado/aplicado.');

    await seedAdmin(this.dataSource);
    this.logger.log('Seed de administrador verificado/aplicado.');
  }
}
