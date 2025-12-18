// Compare what's in the database vs what Azure found in the PDF
const { Pool } = require('pg');
const fs = require('fs');

async function compareDbVsAzure() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 DATABASE vs AZURE PARSING COMPARISON');
  console.log('='.repeat(80));

  // Connect to database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Get all transactions from database
    const result = await pool.query(`
      SELECT
        date,
        description,
        amount,
        type,
        category
      FROM transactions
      ORDER BY date
    `);

    const dbTransactions = result.rows;
    console.log(`\n📊 DATABASE CONTENTS:`);
    console.log('='.repeat(80));
    console.log(`Total transactions in database: ${dbTransactions.length}`);

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
    console.log(`  In Database: ${dbBofaTransactions.length} transactions`);
    console.log(`  Found by Azure: ${azureBofaTransactions.length} transactions`);
    const bofaDiff = azureBofaTransactions.length - dbBofaTransactions.length;
    if (bofaDiff > 0) {
      console.log(`  ⚠️  DISCREPANCY: ${bofaDiff} more transactions in PDF than database`);
    } else if (bofaDiff < 0) {
      console.log(`  ⚠️  DISCREPANCY: ${Math.abs(bofaDiff)} more transactions in database than PDF`);
    } else {
      console.log(`  ✅ Match: Same count in both`);
    }

    // Logix comparison
    console.log('\n🏦 LOGIX FEDERAL CREDIT UNION:');
    console.log(`  In Database: ${dbLogixTransactions.length} transactions`);
    console.log(`  Found by Azure: ${azureLogixTransactions.length} transactions`);
    console.log(`  Expected (from statements): ${expectedLogix.length} transactions`);
    const logixDbDiff = expectedLogix.length - dbLogixTransactions.length;
    const logixAzureDiff = expectedLogix.length - azureLogixTransactions.length;

    if (logixDbDiff > 0) {
      console.log(`  ⚠️  DISCREPANCY: ${logixDbDiff} dividends missing from database`);
      console.log(`     Missing amount: $${expectedLogix.slice(0, logixDbDiff).reduce((s, d) => s + d.amount, 0).toFixed(2)}`);
    }
    if (logixAzureDiff > 0) {
      console.log(`  ⚠️  DISCREPANCY: ${logixAzureDiff} dividends not extracted from Azure data`);
    }

    // Show DB Logix transactions
    if (dbLogixTransactions.length > 0) {
      console.log('\n\n📋 LOGIX TRANSACTIONS IN DATABASE:');
      console.log('='.repeat(80));
      dbLogixTransactions.slice(0, 40).forEach((t, idx) => {
        const dateStr = new Date(t.date).toLocaleDateString('en-US');
        console.log(`${String(idx + 1).padStart(3)}. ${dateStr.padEnd(12)} $${String(t.amount).padStart(10)} ${t.description.substring(0, 60)}`);
      });
    }

    // Show DB BofA sample
    console.log('\n\n📋 BANK OF AMERICA TRANSACTIONS IN DATABASE (First 30):');
    console.log('='.repeat(80));
    dbBofaTransactions.slice(0, 30).forEach((t, idx) => {
      const dateStr = new Date(t.date).toLocaleDateString('en-US');
      console.log(`${String(idx + 1).padStart(3)}. ${dateStr.padEnd(12)} $${String(t.amount).padStart(10)} ${t.description.substring(0, 60)}`);
    });

    if (dbBofaTransactions.length > 30) {
      console.log(`\n... and ${dbBofaTransactions.length - 30} more BofA transactions in database`);
    }

    console.log('\n\n' + '='.repeat(80));
    console.log('✅ FINAL SUMMARY:');
    console.log('='.repeat(80));
    console.log(`Total in Database: ${dbTransactions.length} transactions`);
    console.log(`Total found by Azure: ${azureBofaTransactions.length + azureLogixTransactions.length} transactions`);
    console.log(`Total expected: ${azureBofaTransactions.length + expectedLogix.length} transactions`);

    const totalDiscrepancy = (azureBofaTransactions.length + expectedLogix.length) - dbTransactions.length;
    if (totalDiscrepancy > 0) {
      console.log(`\n⚠️  ${totalDiscrepancy} transactions are missing from the database`);
    } else if (totalDiscrepancy < 0) {
      console.log(`\n⚠️  ${Math.abs(totalDiscrepancy)} extra transactions in the database`);
    } else {
      console.log(`\n✅ All transactions accounted for`);
    }

    await pool.end();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

compareDbVsAzure();
