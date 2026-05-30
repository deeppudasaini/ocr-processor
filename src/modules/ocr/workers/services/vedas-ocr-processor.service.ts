import { OcrJob } from '@modules/ocr/models/ocr-job.model';
import { BillInfo } from '@modules/ocr/models/bill-info.model';
import { OcrProcessorAbstract } from '@modules/ocr/workers/abstracts/ocr-processor.abstract';
import { BillInfoRepository, CreateBillInfoInput } from '@modules/ocr/repositories/bill-info.repository';
import { LocalStorageService } from '@infra/storage/local/storage';
import { MinioStorageService } from '@infra/storage/minio/minio.client';
import { VedasApiResponse } from '@modules/ocr/types/ocr.types';
import { env } from '@config/env';
import { normalizeVedasResponse } from '@modules/ocr/workers/utils/vedas-response-normalizer';

export class VedasOcrProcessorServiceImpl extends OcrProcessorAbstract<Buffer, VedasApiResponse> {
  private readonly billInfoRepo = new BillInfoRepository();
  private readonly localStorage = new LocalStorageService();
  private readonly minioStorage = new MinioStorageService();

  protected async fetchFile(job: OcrJob): Promise<Buffer> {
    if (job.fileStorage === 'local') {
      return this.localStorage.getFile(job.filePath);
    }
    if (job.fileStorage === 'minio') {
      return this.minioStorage.getFile(job.filePath);
    }
    throw new Error(`Unsupported storage backend: ${job.fileStorage}`);
  }

  protected async extractText(file: Buffer, job: OcrJob): Promise<VedasApiResponse> {
    const apiUrl      = env?.VEDAS_OCR_API_URL ?? 'https://pos-ocr.vedastudios.com.np/api/v1/extract';
    const requestTime = new Date();

    try {
      const formData = new FormData();
      formData.append('files', new Blob([file]), 'invoice.jpg');

      const res          = await fetch(apiUrl, { method: 'POST', body: formData });
      const responseTime = new Date();
      const responseData = await res.json() as VedasApiResponse;
      if (!res.ok || !responseData.success) {
        throw new Error(`Vedas API error: ${res.status} ${res.statusText}`,{
          cause:responseData
        });
      }
      await this.billInfoRepo.logApiCall({
        url:             apiUrl,
        requestPayload:  { files: 'binary buffer' },
        responsePayload: responseData as unknown as Record<string, unknown>,
        requestedOn:     requestTime,
        responseOn:      responseTime,
        status:          res.statusText || res.status.toString(),
        ownerType:       'ocr_job',
        ownerId:         job.id,
      });

      return responseData;
    } catch (error) {

      const err = error as Error & { cause?: unknown };

      await this.billInfoRepo.logApiCall({
        url:         apiUrl,
        requestPayload:  { files: 'binary buffer' },
        responsePayload:err.cause as Record<string, unknown>,
        requestedOn: requestTime,
        responseOn:  new Date(),
        status:      'FAILED',
        ownerType:   'ocr_job',
        ownerId:     job.id,
      });
      throw error;
    }
  }

  protected async transformData(response: VedasApiResponse, job: OcrJob): Promise<Partial<BillInfo>> {
    const parseNum = (val: string | null): number | null => {
      if (!val) return null;
      const n = parseFloat(val);
      return isNaN(n) ? null : n;
    };

    const r = normalizeVedasResponse(response);

    const transformed: Partial<CreateBillInfoInput> = {
      jobId:           job.id,
      merchantName:    r.merchantName,
      merchantAddress: r.merchantAddress,
      billDate:        r.billDate,
      billTime:        r.billTime,
      currency:        r.currency,
      subtotalAmount:  parseNum(r.subtotalAmount),
      taxAmount:       parseNum(r.taxAmount),
      serviceCharge:   parseNum(r.serviceCharge),
      tipAmount:       parseNum(r.tipAmount),
      discountAmount:  parseNum(r.discountAmount),
      totalAmount:     parseNum(r.totalAmount),
      items: r.items.map((item) => ({
        itemName:   item.name,
        quantity:   parseNum(item.qty),
        unitPrice:  parseNum(item.unit_price),
        totalPrice: parseNum(item.total_price),
      })),
    };

    return transformed as Partial<BillInfo>;
  }

  protected async saveExtractedData(data: Partial<CreateBillInfoInput>, job: OcrJob): Promise<void> {
    if (!data.jobId) throw new Error('jobId is required to save extracted data');
    await this.billInfoRepo.create(data as CreateBillInfoInput);
  }
}
