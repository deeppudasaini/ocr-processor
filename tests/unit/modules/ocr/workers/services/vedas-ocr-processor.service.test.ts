// vedas-ocr-processor.unit.test.ts
import { OcrJobRepository } from '@modules/ocr/repositories/ocr.repository';
import { BillInfoRepository } from '@modules/ocr/repositories/bill-info.repository';
import { LocalStorageService } from '@infra/storage/local/storage';
import { OcrJobStatus } from '@shared/constants/ocr-job-status.enum';
import { mockJob, mockFetchSuccess, mockFileBuffer } from '../../../../../mocks/mockData';
import { VedasOcrProcessorServiceImpl } from '@modules/ocr/workers/services/vedas-ocr-processor.service';


jest.mock('@modules/ocr/repositories/ocr.repository');
jest.mock('@modules/ocr/repositories/bill-info.repository');
jest.mock('@infra/storage/local/storage');
jest.mock('@infra/cache/redis', () => ({ redisSet: jest.fn() }));

describe('VedasOcrProcessorServiceImpl (Unit)', () => {
  let service: VedasOcrProcessorServiceImpl;
  let ocrJobRepo: jest.Mocked<OcrJobRepository>;
  let billInfoRepo: jest.Mocked<BillInfoRepository>;
  let localStorage: jest.Mocked<LocalStorageService>;

  beforeEach(() => {
    jest.clearAllMocks();

    service      = new VedasOcrProcessorServiceImpl();
    ocrJobRepo   = new OcrJobRepository()    as jest.Mocked<OcrJobRepository>;
    billInfoRepo = new BillInfoRepository()  as jest.Mocked<BillInfoRepository>;
    localStorage = new LocalStorageService() as jest.Mocked<LocalStorageService>;

    (service as any).ocrJobRepo   = ocrJobRepo;
    (service as any).billInfoRepo = billInfoRepo;
    (service as any).localStorage = localStorage;

    ocrJobRepo.findById.mockResolvedValue(mockJob);
    localStorage.getFile.mockResolvedValue(mockFileBuffer);
  });

  it('should process job successfully', async () => {
    await service.process(mockJob.id);

    expect(ocrJobRepo.updateStatus).toHaveBeenCalledWith(mockJob.id, OcrJobStatus.PROCESSING_STARTED);
    expect(localStorage.getFile).toHaveBeenCalledWith(mockJob.filePath);
    expect(billInfoRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      merchantName: 'Test Merchant',
      totalAmount: 23,
    }));
    expect(ocrJobRepo.markCompleted).toHaveBeenCalledWith(mockJob.id);
  });

  it('should mark job as failed on API error', async () => {

    await expect(service.process(mockJob.id)).rejects.toThrow('Network Error');

    expect(ocrJobRepo.markFailed).toHaveBeenCalledWith(mockJob.id, 'Network Error');
  });
});
