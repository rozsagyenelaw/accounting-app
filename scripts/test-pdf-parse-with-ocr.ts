import fs from 'fs/promises';
import FormData from 'form-data';
import fetch from 'node-fetch';

/**
 * Test the full PDF parsing API with OCR on scanned BofA statement
 */
async function testPDFParseAPI() {
  console.log('Testing PDF parse API with scanned BofA statement...\n');

  try {
    const pdfPath = '/Users/rozsagyene/Downloads/1-bofa statements-Logix 23-24.pdf';
    const pdfBuffer = await fs.readFile(pdfPath);

    console.log(`PDF size: ${pdfBuffer.length} bytes\n`);
    console.log('Uploading to /api/parse endpoint...\n');

    // Create form data
    const formData = new FormData();
    formData.append('file', pdfBuffer, {
      filename: '1-bofa statements-Logix 23-24.pdf',
      contentType: 'application/pdf',
    });

    // Make API request
    const startTime = Date.now();

    const response = await fetch('http://localhost:3000/api/parse', {
      method: 'POST',
      body: formData as any,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!response.ok) {
      console.error(`❌ API returned status ${response.status}`);
      const text = await response.text();
      console.error('Response:', text);
      process.exit(1);
    }

    const result = await response.json();

    console.log(`✅ API request completed in ${duration} seconds\n`);
    console.log('=== RESULTS ===\n');
    console.log(`Transactions found: ${result.transactions?.length || 0}`);
    console.log(`Errors: ${result.errors?.length || 0}`);
    console.log(`Warnings: ${result.warnings?.length || 0}\n`);

    if (result.errors && result.errors.length > 0) {
      console.log('Errors:');
      result.errors.forEach((err: string) => console.log(`  - ${err}`));
      console.log('');
    }

    if (result.warnings && result.warnings.length > 0) {
      console.log('Warnings:');
      result.warnings.forEach((warn: string) => console.log(`  - ${warn}`));
      console.log('');
    }

    if (result.transactions && result.transactions.length > 0) {
      console.log('Sample transactions (first 10):');
      result.transactions.slice(0, 10).forEach((txn: any, i: number) => {
        console.log(`\n${i + 1}. ${txn.date.split('T')[0]}`);
        console.log(`   ${txn.description}`);
        console.log(`   ${txn.type}: $${txn.amount.toFixed(2)}`);
      });
      console.log('');
    }

    if (result.transactions && result.transactions.length === 0 && result.errors.length === 0) {
      console.log('⚠️  No transactions found, but also no errors. This may indicate the regex patterns need improvement.');
      process.exit(1);
    }

    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Check if dev server is running
fetch('http://localhost:3000/api/parse', { method: 'GET' })
  .then(() => testPDFParseAPI())
  .then(() => process.exit(0))
  .catch((error) => {
    if (error.code === 'ECONNREFUSED') {
      console.error('\n❌ Could not connect to dev server at http://localhost:3000');
      console.error('Please start the dev server with: npm run dev');
    } else {
      console.error('\n❌ Test failed:', error);
    }
    process.exit(1);
  });
