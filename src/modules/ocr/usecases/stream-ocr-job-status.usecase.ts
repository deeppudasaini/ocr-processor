import { Response } from 'express';
import { OcrJobRepository } from '@modules/ocr/repositories/ocr.repository';
import { OcrJob } from '@modules/ocr/models/ocr-job.model';
import { redisGet } from '@infra/cache/redis';
import { AppError } from '@shared/errors/AppError';
import { OcrJobStatus } from '@shared/constants/ocr-job-status.enum';
import { OcrJobStatusResult } from '@modules/ocr/types/ocr.types';

const POLL_INTERVAL_MS  = 2000;
const POLL_TIMEOUT_MS   = 5 * 60 * 1000;
const TERMINAL_STATUSES = new Set([OcrJobStatus.COMPLETED, OcrJobStatus.FAILED]);

export class StreamOcrJobStatusUseCase {
  private readonly repository = new OcrJobRepository();
  private readonly cacheKey   = (jobId: string) => `ocr:job:${jobId}:status`;

  async execute(jobId: string, res: Response): Promise<void> {
    const job = await this.repository.findById(jobId);
    if (!job) throw AppError.notFound(`OCR Job with ID ${jobId} not found.`);

    this.initSseHeaders(res);
    this.sendEvent(res, 'status', this.toStatusPayload(job));

    if (TERMINAL_STATUSES.has(job.jobStatus as any)) {
      this.sendDone(res, jobId);
      return;
    }

    this.startPolling(jobId, res);
  }


  private initSseHeaders(res: Response): void {
    res.setHeader('Content-Type',      'text/event-stream');
    res.setHeader('Cache-Control',     'no-cache');
    res.setHeader('Connection',        'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
  }

  private sendEvent(res: Response, event: string, data: Record<string, unknown>): void {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  private sendDone(res: Response, jobId: string): void {
    this.sendEvent(res, 'done', { jobId });
    res.end();
  }

  private sendError(res: Response, jobId: string, message: string): void {
    this.sendEvent(res, 'error', { jobId, message });
    res.end();
  }


  private startPolling(jobId: string, res: Response): void {
    const interval: ReturnType<typeof setInterval> = setInterval(async () => {
      try {
        await this.poll(jobId, res, interval);
      } catch (err) {
        clearInterval(interval);
        clearTimeout(timeout);
        this.sendError(res, jobId, (err as Error).message);
      }
    }, POLL_INTERVAL_MS);

    const timeout: ReturnType<typeof setTimeout> = setTimeout(() => {
      clearInterval(interval);
      this.sendError(res, jobId, 'Stream timed out after 5 minutes. Please reconnect.');
    },POLL_TIMEOUT_MS );

    res.on('close', () => {
      clearInterval(interval);
      clearTimeout(timeout);
    });
  }

  private async poll(
    jobId:    string,
    res:      Response,
    interval: ReturnType<typeof setInterval>,
  ): Promise<void> {
    const status = await this.resolveCurrentStatus(jobId);

    if (!status) {
      clearInterval(interval);
      this.sendError(res, jobId, 'Job not found during polling');
      return;
    }

    this.sendEvent(res, 'status', { jobId, status, completedOn: null, errorMessage: null });

    if (TERMINAL_STATUSES.has(status)) {
      clearInterval(interval);
      await this.sendFinalStatus(jobId, res);
      this.sendDone(res, jobId);
    }
  }


  private async resolveCurrentStatus(jobId: string): Promise<OcrJobStatus | null> {
    const cached = await redisGet(this.cacheKey(jobId));
    if (cached) return cached as OcrJobStatus;

    const job = await this.repository.findById(jobId);
    return job?.jobStatus ?? null;
  }

  private async sendFinalStatus(jobId: string, res: Response): Promise<void> {
    const job = await this.repository.findById(jobId);
    this.sendEvent(res, 'status', this.toStatusPayload(job, jobId));
  }

  private toStatusPayload(job: OcrJob | null | undefined, fallbackJobId?: string): Record<string, unknown> {
    return {
      jobId:        job?.id        ?? fallbackJobId,
      status:       job?.jobStatus ?? null,
      completedOn:  job?.completedOn  ?? null,
      errorMessage: job?.errorMessage ?? null,
    };
  }
}
