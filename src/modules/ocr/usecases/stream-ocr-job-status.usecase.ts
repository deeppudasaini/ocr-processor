import { Response } from 'express';
import { OcrJobRepository } from '@modules/ocr/repositories/ocr.repository';
import { redisGet } from '@infra/cache/redis';
import { AppError } from '@shared/errors/AppError';
import { OcrJobStatus } from '@shared/constants/ocr-job-status.enum';

const POLL_INTERVAL_MS = 2000;
const TERMINAL_STATUSES = new Set([OcrJobStatus.COMPLETED, OcrJobStatus.FAILED]);

export class StreamOcrJobStatusUseCase {
  private readonly repository = new OcrJobRepository();

  async execute(jobId: string, res: Response): Promise<void> {
    const job = await this.repository.findById(jobId);
    if (!job) {
      throw AppError.notFound(`OCR Job with ID ${jobId} not found.`);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const sendEvent = (event: string, data: Record<string, unknown>) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('status', {
      jobId,
      status: job.jobStatus,
      completedOn: job.completedOn,
      errorMessage: job.errorMessage,
    });

    if (TERMINAL_STATUSES.has(job?.jobStatus as any)) {
      sendEvent('done', { jobId });
      res.end();
      return;
    }

    const interval = setInterval(async () => {
      try {
        const cacheKey   = `ocr:job:${jobId}:status`;
        const cached     = await redisGet(cacheKey);
        const status     = cached ?? (await this.repository.findById(jobId))?.jobStatus;

        if (!status) {
          clearInterval(interval);
          sendEvent('error', { jobId, message: 'Job not found during polling' });
          res.end();
          return;
        }

        sendEvent('status', {
          jobId,
          status,
          completedOn: null,
          errorMessage: null,
        });

        if (TERMINAL_STATUSES.has(status as any)) {
          const finalJob = await this.repository.findById(jobId);
          sendEvent('status', {
            jobId,
            status:       finalJob?.jobStatus ?? status,
            completedOn:  finalJob?.completedOn  ?? null,
            errorMessage: finalJob?.errorMessage ?? null,
          });
          sendEvent('done', { jobId });
          clearInterval(interval);
          res.end();
        }
      } catch (err) {
        clearInterval(interval);
        sendEvent('error', { jobId, message: (err as Error).message });
        res.end();
      }
    }, POLL_INTERVAL_MS);

    // Clean up if client disconnects
    res.on('close', () => {
      clearInterval(interval);
    });
  }
}
