import { OcrProcessingMessage } from '@modules/ocr/workers/dtos/ocr-processing.message';

export interface OcrProcessing {
  processInvoice(payload: OcrProcessingMessage): Promise<void>;
  getProcessor(): string;
}
