import multer, { FileFilterCallback } from 'multer';
import { Request, RequestHandler } from 'express';
import { AppError } from '@shared/errors/AppError';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
];

const MAX_FILE_SIZE_MB = 10;

const memoryStorage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid file type "${file.mimetype}". Only image files are accepted (JPEG, PNG, GIF, WEBP, BMP, TIFF).`,
        400,
      ),
    );
  }
};

const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 1,
  },
  fileFilter,
});

export const uploadInvoiceFile: RequestHandler = upload.single('file');

export const requireFile: RequestHandler = (req, _res, next): void => {
  if (!req.file) {
    return next(AppError.badRequest('An invoice image file is required. Send it as multipart/form-data with the key "file".'));
  }
  next();
};
