import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ormConfig } from './ormconfig';

export const AppDataSource = new DataSource(ormConfig);

export const connectDatabase = async (): Promise<void> => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
};
