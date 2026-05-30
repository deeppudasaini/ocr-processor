import { OcrProcessorEnum } from '@shared/constants/ocr-processor.enum';

export interface CreateJobDto {
  requestedBy?: string;
  processor?: OcrProcessorEnum;
}
