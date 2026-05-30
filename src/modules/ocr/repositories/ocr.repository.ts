import { Repository } from 'typeorm';
import { AppDataSource } from '@infra/database/typeorm/data-source';
import { OcrJob } from '@modules/ocr/models/ocr-job.model';
import { OcrJobStatus } from '@shared/constants/ocr-job-status.enum';
import { OcrProcessorEnum } from '@shared/constants/ocr-processor.enum';
import { type FileStorage } from '@modules/ocr/models/ocr-job.model';

export interface CreateOcrJobInput {
  jobType: OcrProcessorEnum;
  requestedBy?: string;
  filePath: string;
  fileStorage: FileStorage;
  jobMeta?: Record<string, unknown>;
}

export class OcrJobRepository {
  private get repo(): Repository<OcrJob> {
    return AppDataSource.getRepository(OcrJob);
  }

  async findById(id: string): Promise<OcrJob | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findAll(): Promise<OcrJob[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async create(input: CreateOcrJobInput): Promise<OcrJob> {
    const job = this.repo.create({
      jobType: input.jobType,
      jobStatus: OcrJobStatus.PENDING,
      requestedBy: input.requestedBy ?? null,
      filePath: input.filePath,
      fileStorage: input.fileStorage,
      requestedOn: new Date(),
      jobMeta: input.jobMeta ?? {},
    });
    return this.repo.save(job);
  }

  async updateFilePath(id: string, filePath: string, fileStorage: FileStorage): Promise<void> {
    await this.repo.update(id, { filePath, fileStorage });
  }

  async updateStatus(id: string, status: OcrJobStatus): Promise<void> {
    await this.repo.update(id, { jobStatus: status, updatedAt: new Date() });
  }

  async markCompleted(id: string): Promise<void> {
    await this.repo.update(id, {
      jobStatus: OcrJobStatus.COMPLETED,
      completedOn: new Date(),
      updatedAt: new Date(),
    });
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.repo.update(id, {
      jobStatus: OcrJobStatus.FAILED,
      completedOn: new Date(),
      errorMessage,
      updatedAt: new Date(),
    });
  }
}
