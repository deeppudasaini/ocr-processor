import { OcrJobRepository } from '@modules/ocr/repositories/ocr.repository';
import { AppDataSource } from '@infra/database/typeorm/data-source';
import { OcrProcessorEnum } from '@shared/constants/ocr-processor.enum';
import { OcrJobStatus } from '@shared/constants/ocr-job-status.enum';
import { VedasOcrProcessorServiceImpl } from '@modules/ocr/workers/services/vedas-ocr-processor.service';
import { mockFileBuffer,mockApiResponse } from '../../../../../mocks/mockData';

jest.mock('@infra/cache/redis', () => ({ redisSet: jest.fn() }));

describe('VedasOcrProcessorServiceImpl (Integration)', () => {
  let service: VedasOcrProcessorServiceImpl;
  let ocrJobRepo: OcrJobRepository;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  });

  beforeEach(() => {
    service    = new VedasOcrProcessorServiceImpl();
    ocrJobRepo = new OcrJobRepository();

    // jest.spyOn((service as any).localStorage, 'getFile','get').mockResolvedValue(mockFileBuffer);
    // jest.spyOn(global, 'fetch','set').mockResolvedValue({
    //   ok: true,
    //   status: 200,
    //   statusText: 'OK',
    //   json: jest.fn().mockResolvedValue(mockApiResponse),
    // } as any);
  });

  afterEach(() => jest.restoreAllMocks());

  it('should process job end-to-end and mark as completed', async () => {
    const job = await ocrJobRepo.create({
      jobType: OcrProcessorEnum.VEDAS_STUDIO_EXTRACTOR,
      filePath: 'test/path.jpg',
      fileStorage: 'local',
    });

    await service.process(job.id);

    const updated = await ocrJobRepo.findById(job.id);
    expect(updated?.jobStatus).toBe(OcrJobStatus.COMPLETED);
    expect(updated?.completedOn).not.toBeNull();
  });
});
