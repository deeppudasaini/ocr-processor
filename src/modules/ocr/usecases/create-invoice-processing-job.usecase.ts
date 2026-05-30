import { IBaseUseCase } from '@shared/interfaces';
import { CreateJobDto } from '@modules/ocr/dtos/create-job.dto';
import { CreateJobResult } from '@modules/ocr/types/ocr.types';
import { OcrJobRepository } from '@modules/ocr/repositories/ocr.repository';
import { OcrJobProducer } from '@modules/ocr/queue/ocr-job.producer';
import { LocalStorageService } from '@infra/storage/local/storage';
import { MinioStorageService } from '@infra/storage/minio/minio.client';
import { env } from '@config/env';
import { AppError } from '@shared/errors/AppError';
import { OcrProcessorEnum } from '@shared/constants/ocr-processor.enum';
import { redisSet } from '@infra/cache/redis';
import { OcrJobStatus } from '@shared/constants/ocr-job-status.enum';

export interface CreateInvoiceProcessingJobRequest extends CreateJobDto {
  fileBuffer: Buffer;
  originalName: string;
}

export class CreateInvoiceProcessingJobUseCase
  implements IBaseUseCase<CreateInvoiceProcessingJobRequest, CreateJobResult>
{
  private readonly repository = new OcrJobRepository();
  private readonly producer = new OcrJobProducer();
  private readonly localStorage = new LocalStorageService();
  private readonly minioStorage = new MinioStorageService();

  async execute(request: CreateInvoiceProcessingJobRequest): Promise<CreateJobResult> {
    const processor = request.processor ?? OcrProcessorEnum.VEDAS_STUDIO_EXTRACTOR;
    const storageType = (env?.STORAGE_TYPE ?? 'local') as 'local' | 'minio';
    let savedFilePath = '';

    const job = await this.repository.create({
      jobType: processor,
      requestedBy: request.requestedBy,
      filePath: 'pending',
      fileStorage: storageType,
    });

    try {
      if (storageType === 'local') {
        const stored = await this.localStorage.saveFile(
          request.fileBuffer,
          request.originalName,
          'ocr-uploads',
        );
        savedFilePath = stored.filePath;
      } else if (storageType === 'minio') {
        savedFilePath = await this.minioStorage.saveFile(
          request.fileBuffer,
          request.originalName,
          'ocr-uploads',
        );
      } else {
        throw new Error(`Unsupported storage type: ${storageType}`);
      }

      await this.repository.updateFilePath(job.id, savedFilePath, storageType);

      const cacheKey = `ocr:job:${job.id}:status`;
      await redisSet(cacheKey, OcrJobStatus.PENDING, 86400);

      await this.producer.connect();
      await this.producer.publishOcrJob({
        jobId: job.id,
        extractor: processor,
      });

      return {
        jobId: job.id,
        message: 'Invoice processing job created successfully and queued for extraction.',
      };
    } catch (error) {
      await this.repository.markFailed(job.id, (error as Error).message);
      throw AppError.internal(`Failed to process job creation: ${(error as Error).message}`);
    }
  }
}
