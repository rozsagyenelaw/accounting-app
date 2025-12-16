const fs = require('fs');
const path = require('path');

// Test what Azure Document Intelligence is parsing
async function testAzureParsing() {
  console.log('🔍 TESTING AZURE DOCUMENT INTELLIGENCE PARSER\n');
  console.log('=' .repeat(80));

  // Import the Azure parser
  const { parseWithAzure } = require('../lib/azure-document-parser.ts');

  // Test with Logix statement
  const logixPath = '/Users/rozsagyene/Downloads/drexler logix.pdf';

  if (!fs.existsSync(logixPath)) {
    console.error(`❌ File not found: ${logixPath}`);
    return;
  }

  console.log(`\n📄 Parsing: ${path.basename(logixPath)}`);
  console.log('─'.repeat(80));

  try {
    const buffer = fs.readFileSync(logixPath);
    const result = await parseWithAzure(buffer);

    console.log(`\n✅ Parsing complete!`);
    console.log(`   Total transactions: ${result.transactions.length}`);
    console.log(`   Warnings: ${result.warnings.length}`);

    // Show warnings
    if (result.warnings.length > 0) {
      console.log(`\n⚠️  Warnings:`);
      result.warnings.forEach(w => console.log(`   - ${w}`));
    }

    // Count by type
    const receipts = result.transactions.filter(t => t.type === 'RECEIPT');
    const disbursements = result.transactions.filter(t => t.type === 'DISBURSEMENT');

    console.log(`\n📊 Transaction Summary:`);
    console.log(`   Receipts: ${receipts.length}`);
    console.log(`   Disbursements: ${disbursements.length}`);

    // Filter for dividends
    const dividends = result.transactions.filter(t =>
      /dividend/i.test(t.description) || /logix/i.test(t.description)
    );

    console.log(`\n💰 Dividend Transactions: ${dividends.length}`);
    if (dividends.length > 0) {
      console.log('─'.repeat(80));
      dividends.forEach((txn, idx) => {
        console.log(`${idx + 1}. ${txn.date} - ${txn.description.substring(0, 50)}`);
        console.log(`   Amount: $${txn.amount.toFixed(2)} (${txn.type})`);
      });
    }

    // Calculate total dividend amount
    const totalDividends = dividends.reduce((sum, t) => sum + t.amount, 0);
    console.log(`\n💵 Total Dividends: $${totalDividends.toFixed(2)}`);

    // Compare with expected
    console.log('\n📋 COMPARISON WITH EXPECTED:');
    console.log('─'.repeat(80));
    console.log('Expected from bank statements: 35 Logix dividend transactions');
    console.log('Expected total: $31,328.72');
    console.log(`Actual parsed: ${dividends.length} dividend transactions`);
    console.log(`Actual total: $${totalDividends.toFixed(2)}`);

    const difference = Math.abs(31328.72 - totalDividends);
    console.log(`Difference: $${difference.toFixed(2)}`);

    if (dividends.length >= 35 && difference < 100) {
      console.log('\n✅ SUCCESS! Azure is now parsing Logix dividends correctly.');
    } else {
      console.log('\n❌ ISSUE: Azure may not be capturing all Logix dividends.');
      console.log('   Check the paragraph parsing logic in azure-document-parser.ts');
    }

    // Save detailed results
    const reportPath = '/Users/rozsagyene/accounting-app/azure-parsing-test-results.json';
    fs.writeFileSync(reportPath, JSON.stringify({
      totalTransactions: result.transactions.length,
      dividendTransactions: dividends.length,
      totalDividendAmount: totalDividends,
      transactions: result.transactions,
      warnings: result.warnings
    }, null, 2));
    console.log(`\n💾 Detailed results saved to: ${reportPath}`);

  } catch (error) {
    console.error('\n❌ Error during parsing:', error);
    console.error('Stack:', error.stack);
  }
}

testAzureParsing();
