import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { Request, Response, NextFunction } from 'express';
import { log } from './vite';

const mkdir = promisify(fs.mkdir);

// Define storage for uploaded files
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadDir = path.join(process.cwd(), 'uploads');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      
      cb(null, uploadDir);
    } catch (error) {
      log(`Error creating upload directory: ${error}`, "upload");
      cb(error as any, '');
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// Filter to only allow zip files
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['application/zip', 'application/x-zip-compressed'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only zip files are allowed'));
  }
};

// Create multer upload middleware with 50MB max size
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  }
});

// Error handling middleware for multer
export function handleUploadErrors(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File too large',
        details: 'Maximum file size is 50MB',
      });
    }
    return res.status(400).json({
      message: 'Upload error',
      details: err.message,
    });
  } else if (err) {
    // Another error occurred
    return res.status(500).json({
      message: 'Server error during upload',
      details: err.message,
    });
  }
  
  // No error, continue
  next();
}

export default upload;