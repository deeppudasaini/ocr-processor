import { OcrJobStatus } from '@shared/constants/ocr-job-status.enum';
import { OcrProcessorEnum } from '@shared/constants/ocr-processor.enum';

export const mockJob = {
  id: 'test-job-id',
  jobType: OcrProcessorEnum.VEDAS_STUDIO_EXTRACTOR,
  jobStatus: OcrJobStatus.PENDING,
  filePath: 'test/path.jpg',
  fileStorage: 'local' as const,
  requestedBy: null,
  requestedOn: new Date(),
  completedOn: null,
  errorMessage: null,
  jobMeta: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockApiResponse = {
  success: true,
  filename: 'invoice.jpg',
  merchant_name: 'Test Merchant',
  address: '123 Test St',
  date: '2023-01-01',
  time: '12:00:00',
  currency: 'USD',
  items: [{ name: 'Item 1', qty: '2', unit_price: '10.50', total_price: '21.00' }],
  subtotal_amount: '21.00',
  tax_amount: '2.00',
  service_charge: '0',
  tip_amount: '0',
  discount_amount: '0',
  total_amount: '23.00',
  uncategorized_text: [],
  processing_time: 1.5,
};
export const createMockFetchSuccess = (response = mockApiResponse) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: jest.fn().mockResolvedValue(response),
}) as any;
export const mockFetchSuccess = {
  ok: true,
  status: 200,
  statusText: 'OK',
  json: jest.fn().mockResolvedValue(mockApiResponse),
} as any;

export const mockFileBuffer = Buffer.from('fake-image');
