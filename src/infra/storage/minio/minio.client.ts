import { Client } from 'minio';
import path from 'path';
import { env } from '@config/env';
import { logger } from '@infra/monitoring/logger';

export class MinioStorageService {
  private readonly client: Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = env?.MINIO_BUCKET || 'ocr-bucket';
    let endPoint = env?.MINIO_ENDPOINT || '127.0.0.1';
    let port = 9000;
    let useSSL = false;

    try {
      const url = new URL(env?.MINIO_ENDPOINT || '');
      endPoint = url.hostname;
      if (url.port) {
        port = parseInt(url.port, 10);
      } else {
        port = url.protocol === 'https:' ? 443 : 80;
      }
      useSSL = url.protocol === 'https:';
    } catch(err:any) {
      console.warn('[MinIO] MINIO_ENDPOINT is not a valid URL, using defaults. Error:', err?.message);
      logger.error('[MinIO] Invalid MINIO_ENDPOINT format, expected URL. Falling back to defaults.');
    }

    this.client = new Client({
      endPoint,
      port,
      useSSL,
      accessKey: env?.MINIO_ACCESS_KEY || '',
      secretKey: env?.MINIO_SECRET_KEY || '',
    });
  }


  async saveFile(buffer: Buffer, originalName: string, subFolder = 'uploads'): Promise<string> {
    const ext = path.extname(originalName);
    const key = `${subFolder}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

    const bucketExists = await this.client.bucketExists(this.bucket);
    if (!bucketExists) {
      await this.client.makeBucket(this.bucket, 'us-east-1');
    }

    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': this.getMimeType(ext),
    });

    logger.debug(`[MinIO] Uploaded: ${key}`);
    return key;
  }


  async getFile(key: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, key);

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
    logger.debug(`[MinIO] Deleted: ${key}`);
  }

  private getMimeType(ext: string): string {
    const map: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    };
    return map[ext.toLowerCase()] ?? 'application/octet-stream';
  }
}
