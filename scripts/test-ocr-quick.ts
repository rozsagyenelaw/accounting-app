import { extractTextFromScannedPDF } from '../lib/ocr.js';
import fs from 'fs/promises';

/**
 * Quick OCR test with just 3 pages
 */
async function testOCR() {
  console.log('Starting quick OCR test (3 pages)...\n');

  try {
    const pdfPath = '/Users/rozsagyene/Downloads/1-bofa statements-Logix 23-24.pdf';
    const buffer = await fs.readFile(pdfPath);

    console.log('Starting OCR extraction...\n');
    const startTime = Date.now();

    const text = await extractTextFromScannedPDF(buffer, {
      language: 'eng',
      pageLimit: 3, // Only 3 pages for quick test
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ OCR completed in ${duration} seconds`);
    console.log(`Extracted text length: ${text.length} characters\n`);

    // Look for transaction patterns
    const transactionPattern = /^[*+\\vA!©1-]\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+([-]?\d+[,\d]*\.\d{2})$/gm;
    const matches = [...text.matchAll(transactionPattern)];

    console.log(`Found ${matches.length} transaction patterns\n`);

    if (matches.length > 0) {
      console.log('Sample transactions (first 10):\n');
      matches.slice(0, 10).forEach((match, i) => {
        console.log(`${i + 1}. ${match[1]} | ${match[2].substring(0, 50)}... | $${match[3]}`);
      });
    }

    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

testOCR();
