// ocr.controller.ts
import { Request, Response } from 'express';
import { CreateInvoiceProcessingJobUseCase } from '@modules/ocr/usecases/create-invoice-processing-job.usecase';
import { CheckOcrJobStatusUseCase } from '@modules/ocr/usecases/check-ocr-job-status.usecase';
import { StreamOcrJobStatusUseCase } from '@modules/ocr/usecases/stream-ocr-job-status.usecase';
import { AppError } from '@shared/errors/AppError';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { StatusCodes } from 'http-status-codes';

export class OcrController {
  private readonly createJobUseCase   = new CreateInvoiceProcessingJobUseCase();
  private readonly checkStatusUseCase = new CheckOcrJobStatusUseCase();
  private readonly streamStatusUseCase = new StreamOcrJobStatusUseCase();

// ocr.controller.ts
  processInvoice = asyncHandler(async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];

    const results = await Promise.all(
      files.map((file) =>
        this.createJobUseCase.execute({
          fileBuffer:   file.buffer,
          originalName: file.originalname,
        })
      )
    );

    return {
      data:    results,
      message: `${results.length} job(s) created successfully and queued for extraction.`,
      code:    StatusCodes.ACCEPTED,
    };
  });
  getJobStatus = asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.params;
    if (!jobId) throw AppError.badRequest('jobId is required');

    const result = await this.checkStatusUseCase.execute({ jobId });
    return { data: result, message: 'Status retrieved successfully', code: StatusCodes.OK };
  });

  streamJobStatus = async (req: Request, res: Response): Promise<void> => {
    const { jobId } = req.params;
    if (!jobId) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: 'jobId is required' });
      return;
    }

    try {
      await this.streamStatusUseCase.execute(jobId, res);
    } catch (err) {
      if (!res.headersSent) {
        const status = (err as AppError)?.statusCode ?? StatusCodes.INTERNAL_SERVER_ERROR;
        res.status(status).json({ message: (err as Error).message });
      }
    }
  };

}
