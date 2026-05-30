import { OcrProcessingMessage } from '@modules/ocr/workers/dtos/ocr-processing.message';
import { OcrProcessing } from '@modules/ocr/workers/interfaces/ocr-processing.interface';
import { OcrProcessorAbstract } from '@modules/ocr/workers/abstracts/ocr-processor.abstract';

class OcrProcessorAdapter implements OcrProcessing {
  constructor(
    private readonly processorName: string,
    private readonly impl: OcrProcessorAbstract<unknown, unknown>
  ) {}

  async processInvoice(payload: OcrProcessingMessage): Promise<void> {
    await this.impl.process(payload.jobId);
  }

  getProcessor(): string {
    return this.processorName;
  }
}

export class OcrProcessor {
  private readonly processors = new Map<string, OcrProcessing>();

  constructor(processors: OcrProcessing[]) {
    processors.forEach((processor) => {
      this.processors.set(processor.getProcessor(), processor);
    });
  }

  registerAbstract(processorName: string, abstractProcessor: OcrProcessorAbstract<unknown, unknown>) {
    const adapter = new OcrProcessorAdapter(processorName, abstractProcessor);
    this.processors.set(adapter.getProcessor(), adapter);
  }

  async processOcrProcessing(message: OcrProcessingMessage): Promise<void> {
    const processor = this.processors.get(message.extractor);

    if (!processor) {
      throw new Error(`No OCR processor found for ${message.extractor}`);
    }

    await processor.processInvoice(message);
  }
}
