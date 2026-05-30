import { OcrProcessorEnum } from '@shared/constants/ocr-processor.enum';

export interface OcrProcessingMessage {
  jobId: string;
  extractor: OcrProcessorEnum;
}
