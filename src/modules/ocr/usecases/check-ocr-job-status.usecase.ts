import { IBaseUseCase } from '@shared/interfaces';
import { OcrJobStatusResult } from '@modules/ocr/types/ocr.types';
import { OcrJobRepository } from '@modules/ocr/repositories/ocr.repository';
import { redisGet, redisSet } from '@infra/cache/redis';
import { AppError } from '@shared/errors/AppError';
import { OcrJobStatus } from '@shared/constants/ocr-job-status.enum';

export interface CheckOcrJobStatusRequest {
  jobId: string;
}

export class CheckOcrJobStatusUseCase
  implements IBaseUseCase<CheckOcrJobStatusRequest, OcrJobStatusResult>
{
  private readonly repository = new OcrJobRepository();

  async execute(request: CheckOcrJobStatusRequest): Promise<OcrJobStatusResult> {
    const { jobId } = request;
    const cacheKey = `ocr:job:${jobId}:status`;

    const cachedStatus = await redisGet(cacheKey);

      if (cachedStatus && cachedStatus !== OcrJobStatus.COMPLETED && cachedStatus !== OcrJobStatus.FAILED) {
        return {
          jobId,
          status: cachedStatus as OcrJobStatus,
          completedOn: null,
          errorMessage: null,
        };
      }

    const job = await this.repository.findById(jobId);
    if (!job) {
      throw AppError.notFound(`OCR Job with ID ${jobId} not found.`);
    }

    await redisSet(cacheKey, job.jobStatus, 86400);

    return {
      jobId: job.id,
      status: job.jobStatus,
      completedOn: job.completedOn,
      errorMessage: job.errorMessage,
    };
  }
}
