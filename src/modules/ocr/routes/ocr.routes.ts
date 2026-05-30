import { Router } from 'express';
import { OcrController } from '@modules/ocr/controllers/ocr.controller';
import { uploadInvoiceFile, requireFile } from '@modules/ocr/validators/ocr.validator';

export const ocrRoutes = Router();
const controller = new OcrController();

ocrRoutes.post('/upload',            uploadInvoiceFile,requireFile, controller.processInvoice);
ocrRoutes.get('/jobs/:jobId',         controller.getJobStatus);
ocrRoutes.get('/jobs/:jobId/stream',  controller.streamJobStatus);
