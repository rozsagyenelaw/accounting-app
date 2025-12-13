import { extractTextFromScannedPDF } from '../lib/ocr.js';
import fs from 'fs/promises';

/**
 * Analyze OCR output to understand transaction patterns
 */
async function analyzeOCRText() {
  console.log('Extracting text with OCR...');

  const pdfPath = '/Users/rozsagyene/Downloads/1-bofa statements-Logix 23-24.pdf';
  const buffer = await fs.readFile(pdfPath);

  const text = await extractTextFromScannedPDF(buffer, {
    language: 'eng',
    pageLimit: 2, // Just first 2 pages for analysis
  });

  console.log('\n=== FULL EXTRACTED TEXT ===\n');
  console.log(text);

  console.log('\n\n=== LINE BY LINE (first 100 lines) ===\n');
  const lines = text.split('\n').slice(0, 100);
  lines.forEach((line, i) => {
    if (line.trim()) {
      console.log(`${i}: ${line}`);
    }
  });
}

analyzeOCRText().catch(console.error);
