import { IBaseUseCase } from '@shared/interfaces';
import { OcrJobRepository } from '@modules/ocr/repositories/ocr.repository';
import { OcrJobProducer } from '@modules/ocr/queue/ocr-job.producer';
import { LocalStorageService } from '@infra/storage/local/storage';
import { MinioStorageService } from '@infra/storage/minio/minio.client';
import { env } from '@config/env';
import { AppError } from '@shared/errors/AppError';
import { OcrProcessorEnum } from '@shared/constants/ocr-processor.enum';
import { redisSet } from '@infra/cache/redis';
import { OcrJobStatus } from '@shared/constants/ocr-job-status.enum';
import {
  CreateInvoiceProcessingJobRequest
} from '@modules/ocr/usecases/requests/create-invoice-processing-job.request';
import {
  CreateInvoiceProcessingJobResponse
} from '@modules/ocr/usecases/response/create-invoice-processing-job.response';

type StorageType = 'local' | 'minio';



export class CreateInvoiceProcessingJobUseCase
  implements IBaseUseCase<CreateInvoiceProcessingJobRequest, CreateInvoiceProcessingJobResponse>
{
  private readonly repository   = new OcrJobRepository();
  private readonly producer     = new OcrJobProducer();
  private readonly localStorage = new LocalStorageService();
  private readonly minioStorage = new MinioStorageService();

  async execute(request: CreateInvoiceProcessingJobRequest): Promise<CreateInvoiceProcessingJobResponse> {
    const processor   = OcrProcessorEnum.VEDAS_STUDIO_EXTRACTOR;
    const storageType = (env?.STORAGE_TYPE ?? 'local') as StorageType;
    const filePath = await this.uploadFile(request.fileBuffer, request.originalName, storageType);

    const job = await this.repository.create({
      jobType:     processor,
      requestedBy: 'SYSTEM',
      filePath,
      fileStorage: storageType,
      jobMeta:     { fileName: request.originalName },
    });

    try {
      await Promise.all([
        redisSet(`ocr:job:${job.id}:status`, OcrJobStatus.PENDING, 86400),
        this.publishJob(job.id, processor),
      ]);

      return {
        jobId:   job.id,
        message: 'Invoice processing job created successfully and queued for extraction.',
      };
    } catch (error) {
      await this.repository.markFailed(job.id, (error as Error).message);
      throw AppError.internal(`Failed to process job creation: ${(error as Error).message}`);
    }
  }


  private async uploadFile(
    buffer:       Buffer,
    originalName: string,
    storageType:  StorageType,
  ): Promise<string> {
    try {
      if (storageType === 'local') {
        const stored = await this.localStorage.saveFile(buffer, originalName, 'ocr-uploads');
        return stored.filePath;
      }
      if (storageType === 'minio') {
        return this.minioStorage.saveFile(buffer, originalName, 'ocr-uploads');
      }
      throw new Error(`Unsupported storage type: ${storageType}`);
    } catch (error) {
      throw AppError.internal(`File upload failed: ${(error as Error).message}`);
    }
  }

  private async publishJob(jobId: string, processor: OcrProcessorEnum): Promise<void> {
    await this.producer.connect();
    await this.producer.publishOcrJob({ jobId, extractor: processor });
  }
}
