import { createWorker } from 'tesseract.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);

// Get the absolute path to the tesseract worker
const workerPath = path.join(
  process.cwd(),
  'node_modules',
  'tesseract.js',
  'src',
  'worker-script',
  'node',
  'index.js'
);

/**
 * OCR utility for extracting text from scanned PDFs
 */

interface OCROptions {
  language?: string;
  pageLimit?: number; // Maximum pages to process (for performance)
}

/**
 * Convert PDF to images and extract text using OCR
 */
export async function extractTextFromScannedPDF(
  pdfBuffer: Buffer,
  options: OCROptions = {}
): Promise<string> {
  const { language = 'eng', pageLimit = 100 } = options;

  // Create temporary directory for images
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-ocr-'));
  const pdfPath = path.join(tempDir, 'input.pdf');

  try {
    // Write PDF buffer to temp file
    await fs.writeFile(pdfPath, pdfBuffer);

    console.log('Converting PDF pages to images using poppler...');

    // Use pdftoppm to convert PDF to PNG images
    // -png: output as PNG
    // -r 300: 300 DPI resolution for better OCR quality
    // -l: last page to convert
    const outputPrefix = path.join(tempDir, 'page');

    try {
      await execAsync(
        `pdftoppm -png -r 300 -l ${pageLimit} "${pdfPath}" "${outputPrefix}"`,
        { maxBuffer: 50 * 1024 * 1024 } // 50MB buffer
      );
    } catch (error) {
      console.error('Error converting PDF to images:', error);
      throw new Error(`Failed to convert PDF to images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // List generated PNG files
    const files = await fs.readdir(tempDir);
    const imageFiles = files
      .filter(f => f.endsWith('.png'))
      .sort(); // Sort to ensure correct order

    console.log(`Converted ${imageFiles.length} pages to images`);

    // Initialize Tesseract worker with absolute path for Next.js compatibility
    const worker = await createWorker(language, undefined, {
      workerPath,
    });

    let fullText = '';

    // Process each page image
    for (let i = 0; i < imageFiles.length; i++) {
      try {
        const pageNum = i + 1;
        console.log(`Running OCR on page ${pageNum}/${imageFiles.length}...`);

        const imagePath = path.join(tempDir, imageFiles[i]);

        // Run OCR on the image
        const { data } = await worker.recognize(imagePath);
        fullText += data.text + '\n\n';

        console.log(`Page ${pageNum} OCR completed. Extracted ${data.text.length} characters.`);
      } catch (error) {
        console.error(`Error processing page ${i + 1}:`, error);
        // Continue with next page
      }
    }

    // Cleanup
    await worker.terminate();

    console.log(`OCR completed. Total text extracted: ${fullText.length} characters`);
    return fullText;
  } finally {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up temp directory:', error);
    }
  }
}

/**
 * Check if PDF has extractable text (not scanned)
 */
export function isScannedPDF(text: string): boolean {
  const trimmedText = text.trim();
  // If less than 50 characters extracted, it's likely scanned
  return trimmedText.length < 50;
}
