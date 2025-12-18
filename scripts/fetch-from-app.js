// Fetch transactions from the running app and compare with Azure results
const fs = require('fs');

async function fetchAndCompare() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 FETCHING TRANSACTIONS FROM RUNNING APP');
  console.log('='.repeat(80));

  try {
    // Fetch from the running Next.js app
    const response = await fetch('http://localhost:3000/api/transactions');

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      console.log('\nℹ️  Make sure the app is running with: npm run dev');
      process.exit(1);
    }

    const data = await response.json();
    const dbTransactions = data.transactions || [];

    console.log(`\n📊 TRANSACTIONS IN APP:`);
    console.log('='.repeat(80));
    console.log(`Total transactions: ${dbTransactions.length}`);

    // Separate by source
    const dbBofaTransactions = dbTransactions.filter(t =>
      t.description && (
        t.description.includes('CHECKCARD') ||
        t.description.includes('SSA TREAS') ||
        t.description.includes('WIRE TYPE') ||
        /CHECK #?\d+/i.test(t.description) ||
        t.description.includes('Bank of America')
      )
    );

    const dbLogixTransactions = dbTransactions.filter(t =>
      t.description && t.description.toLowerCase().includes('logix')
    );

    const dbOtherTransactions = dbTransactions.filter(t =>
      !dbBofaTransactions.includes(t) && !dbLogixTransactions.includes(t)
    );

    console.log(`Bank of America transactions: ${dbBofaTransactions.length}`);
    console.log(`Logix transactions: ${dbLogixTransactions.length}`);
    console.log(`Other transactions: ${dbOtherTransactions.length}`);

    // Calculate totals
    const bofaReceipts = dbBofaTransactions.filter(t => t.type === 'RECEIPT');
    const bofaPayments = dbBofaTransactions.filter(t => t.type === 'PAYMENT' || t.type === 'DISBURSEMENT');
    const logixReceipts = dbLogixTransactions.filter(t => t.type === 'RECEIPT');

    console.log(`\nBank of America receipts: ${bofaReceipts.length}, $${bofaReceipts.reduce((s, t) => s + parseFloat(t.amount), 0).toFixed(2)}`);
    console.log(`Bank of America payments: ${bofaPayments.length}, $${bofaPayments.reduce((s, t) => s + parseFloat(t.amount), 0).toFixed(2)}`);
    console.log(`Logix receipts: ${logixReceipts.length}, $${logixReceipts.reduce((s, t) => s + parseFloat(t.amount), 0).toFixed(2)}`);

    // Load Azure data
    const azureBofaTransactions = JSON.parse(fs.readFileSync('/Users/rozsagyene/accounting-app/bofa-from-azure.json', 'utf-8'));
    const azureLogixTransactions = JSON.parse(fs.readFileSync('/Users/rozsagyene/accounting-app/logix-from-azure.json', 'utf-8'));
    const expectedLogix = JSON.parse(fs.readFileSync('/Users/rozsagyene/accounting-app/logix-dividends-from-statements.json', 'utf-8'));

    console.log('\n\n📊 AZURE PARSING RESULTS:');
    console.log('='.repeat(80));
    console.log(`Bank of America transactions: ${azureBofaTransactions.length}`);
    console.log(`Logix transactions (extracted): ${azureLogixTransactions.length}`);
    console.log(`Logix transactions (expected): ${expectedLogix.length}`);

    console.log('\n\n📊 COMPARISON SUMMARY:');
    console.log('='.repeat(80));

    // BofA comparison
    console.log('\n🏦 BANK OF AMERICA:');
    console.log(`  In App: ${dbBofaTransactions.length} transactions`);
    console.log(`  Found by Azure: ${azureBofaTransactions.length} transactions`);
    const bofaDiff = azureBofaTransactions.length - dbBofaTransactions.length;
    if (bofaDiff > 0) {
      console.log(`  ⚠️  DISCREPANCY: ${bofaDiff} MORE transactions found in PDF than in app`);
    } else if (bofaDiff < 0) {
      console.log(`  ⚠️  DISCREPANCY: ${Math.abs(bofaDiff)} MORE transactions in app than in PDF`);
    } else {
      console.log(`  ✅ MATCH: Same count in both`);
    }

    // Logix comparison
    console.log('\n🏦 LOGIX FEDERAL CREDIT UNION:');
    console.log(`  In App: ${dbLogixTransactions.length} transactions`);
    console.log(`  Found by Azure: ${azureLogixTransactions.length} transactions`);
    console.log(`  Expected (from statements): ${expectedLogix.length} transactions`);

    const logixAppDiff = expectedLogix.length - dbLogixTransactions.length;
    const logixAzureDiff = expectedLogix.length - azureLogixTransactions.length;

    if (logixAppDiff > 0) {
      const missingAmount = expectedLogix.slice(dbLogixTransactions.length).reduce((s, d) => s + d.amount, 0);
      console.log(`  ⚠️  DISCREPANCY: ${logixAppDiff} dividends MISSING from app`);
      console.log(`     Missing amount: $${missingAmount.toFixed(2)}`);
    } else if (logixAppDiff < 0) {
      console.log(`  ⚠️  DISCREPANCY: ${Math.abs(logixAppDiff)} EXTRA dividends in app`);
    } else {
      console.log(`  ✅ MATCH: All expected dividends are in app`);
    }

    if (logixAzureDiff > 0) {
      console.log(`  ℹ️  Note: ${logixAzureDiff} dividends not extracted from Azure (parsing issue)`);
    }

    // Show Logix transactions in app
    if (dbLogixTransactions.length > 0) {
      console.log('\n\n📋 LOGIX TRANSACTIONS IN APP:');
      console.log('='.repeat(80));
      dbLogixTransactions.forEach((t, idx) => {
        const dateStr = new Date(t.date).toLocaleDateString('en-US');
        console.log(`${String(idx + 1).padStart(3)}. ${dateStr.padEnd(12)} $${String(t.amount).padStart(10)} ${t.description.substring(0, 60)}`);
      });
    }

    // Show BofA sample
    console.log('\n\n📋 BANK OF AMERICA TRANSACTIONS IN APP (First 30):');
    console.log('='.repeat(80));
    dbBofaTransactions.slice(0, 30).forEach((t, idx) => {
      const dateStr = new Date(t.date).toLocaleDateString('en-US');
      console.log(`${String(idx + 1).padStart(3)}. ${dateStr.padEnd(12)} $${String(t.amount).padStart(10)} ${t.description.substring(0, 60)}`);
    });

    if (dbBofaTransactions.length > 30) {
      console.log(`\n... and ${dbBofaTransactions.length - 30} more BofA transactions`);
    }

    console.log('\n\n' + '='.repeat(80));
    console.log('✅ FINAL SUMMARY:');
    console.log('='.repeat(80));
    console.log(`Total in App: ${dbTransactions.length} transactions`);
    console.log(`Total found by Azure: ${azureBofaTransactions.length + azureLogixTransactions.length} transactions`);
    console.log(`Total expected: ${azureBofaTransactions.length + expectedLogix.length} transactions`);

    const totalExpected = azureBofaTransactions.length + expectedLogix.length;
    const totalDiscrepancy = totalExpected - dbTransactions.length;

    if (totalDiscrepancy > 0) {
      console.log(`\n⚠️  ISSUE: ${totalDiscrepancy} transactions are MISSING from the app`);
      console.log(`\nBREAKDOWN:`);
      console.log(`  • Bank of America: ${bofaDiff > 0 ? bofaDiff + ' missing' : 'all present'}`);
      console.log(`  • Logix dividends: ${logixAppDiff > 0 ? logixAppDiff + ' missing' : 'all present'}`);
    } else if (totalDiscrepancy < 0) {
      console.log(`\n⚠️  ISSUE: ${Math.abs(totalDiscrepancy)} EXTRA transactions in the app`);
    } else {
      console.log(`\n✅ Perfect match: All transactions accounted for`);
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nℹ️  Make sure the app is running with: npm run dev');
    process.exit(1);
  }
}

fetchAndCompare();
