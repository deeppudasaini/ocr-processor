import { databaseConfig } from '@config/database';
import type { DataSourceOptions } from 'typeorm';

export const ormConfig: DataSourceOptions = {
  ...databaseConfig,
};
