import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import * as JSZip from 'jszip';
import { log } from './vite';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const readFile = promisify(fs.readFile);

// Filter out files that we don't need to analyze
const shouldSkipFile = (filePath: string): boolean => {
  // Skip binary files, images, videos, etc.
  const skipExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.webp',
    '.mp4', '.webm', '.ogg', '.mp3', '.wav',
    '.pdf', '.zip', '.rar', '.7z', '.tar', '.gz',
    '.woff', '.woff2', '.eot', '.ttf', 
    '.exe', '.dll', '.so', '.dylib', '.class'
  ];
  
  // Skip directories that typically contain build artifacts or dependencies
  const skipDirectories = [
    'node_modules', 'dist', 'build', 'target', 'out',
    '.git', '.idea', '.vscode', '.next', '.vercel',
    'vendor', 'bower_components', 'jspm_packages',
    '__pycache__', 'venv', 'env', '.env', '.venv'
  ];
  
  // Check extensions
  if (skipExtensions.some(ext => filePath.toLowerCase().endsWith(ext))) {
    return true;
  }
  
  // Check directories
  if (skipDirectories.some(dir => 
    filePath.includes(`/${dir}/`) || 
    filePath.startsWith(`${dir}/`) || 
    filePath === dir
  )) {
    return true;
  }
  
  return false;
};

// Ensures we don't exceed a byte size
const shouldIncludeFile = (content: string): boolean => {
  // Skip empty or binary-like files
  if (!content || content.length === 0) {
    return false;
  }
  
  // Skip large files
  const MAX_FILE_SIZE = 500 * 1024; // 500KB
  if (content.length > MAX_FILE_SIZE) {
    return false;
  }
  
  // Skip files that appear to be binary (have too many non-printable characters)
  const nonPrintableChars = content.replace(/[\x20-\x7E\t\n\r]/g, '');
  if (nonPrintableChars.length > content.length * 0.1) {
    return false;
  }
  
  return true;
};

/**
 * Process a ZIP file to extract code files for analysis
 * @param zipBuffer Buffer containing zip file data
 * @returns Object mapping file paths to their contents
 */
export async function extractFilesFromZip(
  zipBuffer: Buffer
): Promise<Record<string, string>> {
  try {
    const files: Record<string, string> = {};
    const zip = await JSZip.loadAsync(zipBuffer);
    
    const entries = Object.entries(zip.files);
    
    for (const [filePath, fileEntry] of entries) {
      // Skip directories
      if (fileEntry.dir) continue;
      
      // Skip files we don't want to analyze
      if (shouldSkipFile(filePath)) continue;
      
      try {
        // Get file content as text
        const content = await fileEntry.async('text');
        
        // Check if we should include this file
        if (shouldIncludeFile(content)) {
          files[filePath] = content;
        }
      } catch (error) {
        log(`Error extracting file: ${filePath}. Error: ${error}`, "file-utils");
        // Skip this file and continue
        continue;
      }
    }
    
    return files;
  } catch (error) {
    log(`Error processing zip file: ${error}`, "file-utils");
    throw new Error(`Failed to process zip file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Save a ZIP file to a temporary location
 * @param zipBuffer Buffer containing zip file data
 * @param filename Name to save the file as
 * @returns Path to the saved zip file
 */
export async function saveZipFile(
  zipBuffer: Buffer,
  filename: string
): Promise<string> {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    
    const filePath = path.join(uploadsDir, filename);
    await writeFile(filePath, zipBuffer);
    
    return filePath;
  } catch (error) {
    log(`Error saving zip file: ${error}`, "file-utils");
    throw new Error(`Failed to save zip file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Cleans up temporary files and directories
 * @param filePath Path to the file or directory to clean up
 */
export async function cleanupTempFiles(filePath: string): Promise<void> {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    log(`Error cleaning up temp files: ${error}`, "file-utils");
    // Don't throw - this is a cleanup operation that shouldn't break the flow
  }
}