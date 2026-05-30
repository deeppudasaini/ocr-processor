import { OcrProcessorEnum } from '@shared/constants/ocr-processor.enum';
import type { FileStorage } from '@modules/ocr/models/ocr-job.model';

export interface CreateOcrJobInput {
  jobType: OcrProcessorEnum;
  requestedBy?: string;
  filePath: string;
  fileStorage: FileStorage;
  jobMeta?: Record<string, unknown>;
}
