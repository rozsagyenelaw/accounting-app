import { extractTextFromScannedPDF } from '../lib/ocr.js';
import { parseBankOfAmericaStatement } from '../lib/bank-statement-parser.js';
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
      // No page limit - process all pages
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

    // Now parse transactions using the new proximity-based parser
    console.log('\n\n=== Parsing transactions with proximity matching ===\n');
    const transactions = parseBankOfAmericaStatement(text);

    console.log(`\n✅ Parsed ${transactions.length} total transactions`);

    const receipts = transactions.filter(t => t.type === 'RECEIPT');
    const disbursements = transactions.filter(t => t.type === 'DISBURSEMENT');

    console.log(`   Receipts: ${receipts.length}`);
    console.log(`   Disbursements: ${disbursements.length}`);

    if (transactions.length > 0) {
      console.log('\n=== Sample transactions ===');
      transactions.slice(0, 10).forEach(t => {
        console.log(`${t.date.toISOString().split('T')[0]} | ${t.type.padEnd(13)} | $${t.amount.toFixed(2).padStart(10)} | ${t.description.substring(0, 50)}`);
      });
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
