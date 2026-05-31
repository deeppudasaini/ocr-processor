import { OcrJobRepository } from '@modules/ocr/repositories/ocr.repository';
import { BillInfoRepository } from '@modules/ocr/repositories/bill-info.repository';
import { LocalStorageService } from '@infra/storage/local/storage';
import { OcrJobStatus } from '@shared/constants/ocr-job-status.enum';
import { VedasOcrProcessorServiceImpl } from '@modules/ocr/workers/services/vedas-ocr-processor.service';


jest.mock('@modules/ocr/repositories/ocr.repository');
jest.mock('@modules/ocr/repositories/bill-info.repository');
jest.mock('@infra/storage/local/storage');
jest.mock('@infra/cache/redis', () => ({ redisSet: jest.fn() }));

const mockFetch = jest.fn();
global.fetch = mockFetch;


const mockJob = {
  id:          'job-123',
  fileStorage: 'local',
  filePath:    'uploads/invoice.jpg',
  jobMeta:     { fileName: 'invoice.jpg' },
};

const mockFileBuffer = Buffer.from('fake-image-data');

const mockOcrApiResponse = {
  data: [
    {
      success:         true,
      merchant_name:   'Test Merchant',
      address:         '123 Test St',
      date:            '2025-01-01',
      time:            '10:00:00',
      currency:        'NPR',
      subtotal_amount: '20.00',
      tax_amount:      '3.00',
      service_charge:  '0.00',
      tip_amount:      '0.00',
      discount_amount: '0.00',
      total_amount:    '23.00',
      items: [
        { name: 'Item A', qty: '1', unit_price: '20.00', total_price: '20.00' },
      ],
    },
  ],
};

function buildService() {
  const service      = new VedasOcrProcessorServiceImpl();
  const ocrJobRepo   = new OcrJobRepository()    as jest.Mocked<OcrJobRepository>;
  const billInfoRepo = new BillInfoRepository()  as jest.Mocked<BillInfoRepository>;
  const localStorage = new LocalStorageService() as jest.Mocked<LocalStorageService>;

  (service as any).ocrJobRepo   = ocrJobRepo;
  (service as any).billInfoRepo = billInfoRepo;
  (service as any).localStorage = localStorage;

  // Sensible defaults — individual tests override as needed.
  ocrJobRepo.findById.mockResolvedValue(mockJob as any);
  ocrJobRepo.updateStatus.mockResolvedValue(undefined);
  ocrJobRepo.markCompleted.mockResolvedValue(undefined);
  ocrJobRepo.markFailed.mockResolvedValue(undefined);
  localStorage.getFile.mockResolvedValue(mockFileBuffer);
  billInfoRepo.saveBillsInTransaction.mockResolvedValue(undefined);
  billInfoRepo.logApiCall.mockResolvedValue(undefined);

  return { service, ocrJobRepo, billInfoRepo, localStorage };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('VedasOcrProcessorServiceImpl (Unit)', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok:         true,
      status:     200,
      statusText: 'OK',
      json:       async () => mockOcrApiResponse,
    });
  });

  it('should walk through all status transitions and mark job completed', async () => {
    const { service, ocrJobRepo } = buildService();

    await service.process(mockJob.id);

    const statusCalls = ocrJobRepo.updateStatus.mock.calls.map(([, status]) => status);

    expect(statusCalls).toEqual([
      OcrJobStatus.PROCESSING_STARTED,
      OcrJobStatus.FETCHING_FILE,
      OcrJobStatus.EXTRACTING_TEXT,
      OcrJobStatus.TRANSFORMING_DATA,
      OcrJobStatus.SAVING_DATA,
    ]);

    expect(ocrJobRepo.markCompleted).toHaveBeenCalledWith(mockJob.id);
    expect(ocrJobRepo.markFailed).not.toHaveBeenCalled();
  });

  it('should call saveBillsInTransaction with correct merchant and total', async () => {
    const { service, billInfoRepo } = buildService();

    await service.process(mockJob.id);

    expect(billInfoRepo.saveBillsInTransaction).toHaveBeenCalledTimes(1);
    expect(billInfoRepo.saveBillsInTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId:        mockJob.id,
        merchantName: 'Test Merchant',
        totalAmount:  23,
      }),
    );
  });

  it('should log the Vedas API call with correct owner metadata', async () => {
    const { service, billInfoRepo } = buildService();

    await service.process(mockJob.id);

    expect(billInfoRepo.logApiCall).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerType: 'ocr_job',
        ownerId:   mockJob.id,
        status:    expect.any(String),
      }),
    );
  });

  it('should mark job as FAILED and log API call when Vedas returns non-2xx', async () => {
    const { service, ocrJobRepo, billInfoRepo } = buildService();

    mockFetch.mockResolvedValue({
      ok:         false,
      status:     503,
      statusText: 'Service Unavailable',
      json:       async () => ({ data: [{ success: false }] }),
    });

    await expect(service.process(mockJob.id)).rejects.toThrow();

    expect(ocrJobRepo.markFailed).toHaveBeenCalledWith(mockJob.id, expect.any(String));
    expect(ocrJobRepo.markCompleted).not.toHaveBeenCalled();
    expect(billInfoRepo.logApiCall).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'FAILED', ownerId: mockJob.id }),
    );
  });

  it('should mark job as FAILED and skip OCR call when file retrieval throws', async () => {
    const { service, ocrJobRepo, localStorage } = buildService();

    localStorage.getFile.mockRejectedValue(new Error('File not found in storage'));

    await expect(service.process(mockJob.id)).rejects.toThrow('File not found in storage');

    expect(ocrJobRepo.markFailed).toHaveBeenCalledWith(mockJob.id, 'File not found in storage');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should throw and call markFailed when job does not exist', async () => {
    const { service, ocrJobRepo } = buildService();

    ocrJobRepo.findById.mockResolvedValue(null);

    await expect(service.process('non-existent-id')).rejects.toThrow('non-existent-id');

    expect(ocrJobRepo.updateStatus).not.toHaveBeenCalled();
    expect(ocrJobRepo.markCompleted).not.toHaveBeenCalled();
    expect(ocrJobRepo.markFailed).toHaveBeenCalledWith('non-existent-id', expect.any(String));
  });
});
