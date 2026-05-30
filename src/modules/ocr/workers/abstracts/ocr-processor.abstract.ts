import { OcrJobStatus } from '@shared/constants/ocr-job-status.enum';
import { OcrJob } from '@modules/ocr/models/ocr-job.model';
import { BillInfo } from '@modules/ocr/models/bill-info.model';
import { logger } from '@infra/monitoring/logger';
import { OcrJobRepository } from '@modules/ocr/repositories/ocr.repository';
import { redisSet } from '@infra/cache/redis';

export abstract class OcrProcessorAbstract<TFile, TRawOcrResponse> {
  private readonly ocrJobRepo = new OcrJobRepository()
  async process(jobId: string): Promise<void> {
    try {
      logger.info(`[OcrProcessor] Starting job ${jobId}`);

      const job = await this.fetchJob(jobId);
      await this.updateJobStatus(job, OcrJobStatus.PROCESSING_STARTED);

      await this.updateJobStatus(job, OcrJobStatus.FETCHING_FILE);
      const file = await this.fetchFile(job);

      await this.updateJobStatus(job, OcrJobStatus.EXTRACTING_TEXT);
      const rawResponse = await this.extractText(file, job);

      await this.updateJobStatus(job, OcrJobStatus.TRANSFORMING_DATA);
      const transformedData = await this.transformData(rawResponse, job);

      await this.updateJobStatus(job, OcrJobStatus.SAVING_DATA);
      await this.saveExtractedData(transformedData, job);

      await this.updateJobStatus(job, OcrJobStatus.COMPLETED);
      logger.info(`[OcrProcessor] Finished job ${jobId} successfully`);
    } catch (error) {
      logger.error(`[OcrProcessor] Job ${jobId} failed`, { error: (error as Error).message });
      await this.handleFailure(jobId, error);
      throw error;
    }
  }

  protected async fetchJob(jobId: string): Promise<OcrJob> {
    const job = await this.ocrJobRepo.findById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    return job;
  }

  protected async updateJobStatus(job: OcrJob, status: OcrJobStatus): Promise<void> {
    switch (status) {
      case OcrJobStatus.COMPLETED:
        await this.ocrJobRepo.markCompleted(job.id);
        break;
      default:
        await this.ocrJobRepo.updateStatus(job.id, status);
    }
    await redisSet(`ocr:job:${job.id}:status`, status, 86400);
  }
  protected abstract fetchFile(job: OcrJob): Promise<TFile>;
  protected abstract extractText(file: TFile, job: OcrJob): Promise<TRawOcrResponse>;
  protected abstract transformData(response: TRawOcrResponse, job: OcrJob): Promise<Partial<BillInfo>>;
  protected abstract saveExtractedData(data: Partial<BillInfo>, job: OcrJob): Promise<void>;
  protected async handleFailure(jobId: string, error: unknown): Promise<void> {
    const errMsg = error instanceof Error ? error.message : String(error);
    await this.ocrJobRepo.markFailed(jobId, errMsg);
    await redisSet(`ocr:job:${jobId}:status`, OcrJobStatus.FAILED, 86400);
  }
}
