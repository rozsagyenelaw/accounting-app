import { extractTextFromScannedPDF } from '../lib/ocr.js';
import fs from 'fs/promises';

/**
 * Test OCR functionality with the BofA scanned PDF
 */
async function testOCR() {
  console.log('Starting OCR test...');

  try {
    const pdfPath = '/Users/rozsagyene/Downloads/1-bofa statements-Logix 23-24.pdf';
    console.log(`Reading PDF: ${pdfPath}`);

    const buffer = await fs.readFile(pdfPath);
    console.log(`PDF size: ${buffer.length} bytes`);

    console.log('\nStarting OCR extraction (this may take a few minutes)...');
    const startTime = Date.now();

    const text = await extractTextFromScannedPDF(buffer, {
      language: 'eng',
      pageLimit: 5, // Process only first 5 pages for testing
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ OCR completed in ${duration} seconds`);
    console.log(`Extracted text length: ${text.length} characters`);
    console.log('\n=== First 2000 characters of extracted text ===\n');
    console.log(text.substring(0, 2000));

    // Look for transaction patterns
    const datePattern = /\d{1,2}\/\d{1,2}\/\d{2,4}/g;
    const dates = text.match(datePattern);
    console.log(`\n\nFound ${dates?.length || 0} date patterns`);

    if (dates && dates.length > 0) {
      console.log('Sample dates found:', dates.slice(0, 10));
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

testOCR()
  .then(() => {
    console.log('\n✨ Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
