import { OcrProcessor } from '@modules/ocr/workers/ocr-processor';
import { VedasOcrProcessorServiceImpl } from '@modules/ocr/workers/services/vedas-ocr-processor.service';
import { OcrProcessorEnum } from '@shared/constants/ocr-processor.enum';
import { OcrJobRepository } from '@modules/ocr/repositories/ocr.repository';

const ocrProcessorRegistry = new OcrProcessor([]);

ocrProcessorRegistry.registerAbstract(
  OcrProcessorEnum.VEDAS_STUDIO_EXTRACTOR,
  new VedasOcrProcessorServiceImpl()
);

export default ocrProcessorRegistry;
