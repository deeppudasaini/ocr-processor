import { OcrProcessorEnum } from '@shared/constants/ocr-processor.enum';
import { OcrJobStatus } from '@shared/constants/ocr-job-status.enum';

export type FileStorage = 'local' | 'minio';

export interface OcrProcessingMessage {
  jobId: string;
  extractor: OcrProcessorEnum;
}

export interface VedasApiItem {
  name: string;
  qty: string;
  unit_price: string;
  total_price: string;
}

export interface VedasApiResponse {
  success: boolean;
  filename: string;
  merchant_name: string;
  address: string;
  date: string;
  time: string;
  currency: string;
  items: VedasApiItem[];
  subtotal_amount: string;
  tax_amount: string;
  service_charge: string;
  tip_amount: string;
  discount_amount: string;
  total_amount: string;
  uncategorized_text: string[];
  processing_time: number;
}

export interface OcrJobStatusResult {
  jobId: string;
  status: OcrJobStatus;
  completedOn: Date | null;
  errorMessage: string | null;
}

export interface CreateJobResult {
  jobId: string;
  message: string;
}
