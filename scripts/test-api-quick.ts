import fs from 'fs/promises';
import FormData from 'form-data';
import fetch from 'node-fetch';

/**
 * Test the API with just 3 pages (using a smaller PDF)
 */
async function testAPI() {
  console.log('Testing PDF parse API...\n');

  try {
    const pdfPath = '/Users/rozsagyene/Downloads/1-bofa statements-Logix 23-24.pdf';
    const pdfBuffer = await fs.readFile(pdfPath);

    console.log(`PDF size: ${pdfBuffer.length} bytes`);
    console.log('Uploading to /api/parse endpoint...\n');

    const formData = new FormData();
    formData.append('file', pdfBuffer, {
      filename: '1-bofa statements-Logix 23-24.pdf',
      contentType: 'application/pdf',
    });

    const startTime = Date.now();

    const response = await fetch('http://localhost:3000/api/parse', {
      method: 'POST',
      body: formData as any,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!response.ok) {
      console.error(`❌ API returned status ${response.status}`);
      const text = await response.text();
      console.error('Response:', text.substring(0, 500));
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
      console.log('Sample transactions (first 15):');
      result.transactions.slice(0, 15).forEach((txn: any, i: number) => {
        const date = new Date(txn.date).toLocaleDateString();
        console.log(`\n${i + 1}. ${date}`);
        console.log(`   ${txn.description.substring(0, 60)}${txn.description.length > 60 ? '...' : ''}`);
        console.log(`   ${txn.type}: $${txn.amount.toFixed(2)}`);
      });
      console.log('');
    }

    if (result.transactions && result.transactions.length > 0) {
      console.log('\n✅ SUCCESS! OCR and transaction parsing working correctly!');
      process.exit(0);
    } else {
      console.log('\n⚠️  No transactions found');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Check if dev server is running
fetch('http://localhost:3000/api/parse', { method: 'GET' })
  .then(() => testAPI())
  .catch((error) => {
    if (error.code === 'ECONNREFUSED') {
      console.error('\n❌ Could not connect to dev server at http://localhost:3000');
      console.error('Please start the dev server with: npm run dev');
    } else {
      console.error('\n❌ Connection test failed:', error);
    }
    process.exit(1);
  });
