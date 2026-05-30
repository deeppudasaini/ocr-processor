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
const MAX_FILE_COUNT   = 5;

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
    files: MAX_FILE_COUNT,
  },
  fileFilter,
});

export const uploadInvoiceFile: RequestHandler = upload.array('file',MAX_FILE_COUNT);

export const requireFile: RequestHandler = (req, _res, next): void => {
  const files = req.files as Express.Multer.File[] | undefined;


  if (!files || files.length === 0) {
    return next(AppError.badRequest(
      'At least one invoice image file is required. Send it as multipart/form-data with the key "files".',
    ));
  }
  if(files?.length>MAX_FILE_COUNT) {
    return next(AppError.badRequest(
      `Too many files uploaded. Maximum allowed is ${MAX_FILE_COUNT}.`,
    ));
  }

  next();
};
