import fs from 'fs';
import path from 'path';
import { env } from '@config/env';
import { logger } from '@infra/monitoring/logger';
import * as process from 'process';

export interface StoredFile {
  filePath: string;
  fullPath: string;
}

export class LocalStorageService {
  private readonly basePath: string;

  constructor() {
    this.basePath = path.resolve(process.cwd(), env?.LOCAL_STORAGE_PATH || "");
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
      logger.info(`[LocalStorage] Storage directory created at ${this.basePath}`);
    }
  }

  async saveFile(buffer: Buffer, originalName: string, subFolder = 'uploads'): Promise<StoredFile> {
    const dir = path.join(this.basePath, subFolder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const ext = path.extname(originalName);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const fullPath = path.join(dir, fileName);
    const filePath = path.join(subFolder, fileName).replace(/\\/g, '/');

    await fs.promises.writeFile(fullPath, buffer);
    logger.debug(`[LocalStorage] Saved file: ${filePath}`);

    return { filePath, fullPath };
  }

  async getFile(relativePath: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, relativePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found at local path: ${relativePath}`);
    }
    return fs.promises.readFile(fullPath);
  }
}
