const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Paths
const BOA_EXCEL = '/Users/rozsagyene/Downloads/drexler bank statemetns 2023-2025.xlsx';
const LOGIX_FULL_TXT = '/Users/rozsagyene/accounting-app/logix-statement-full.txt';
const LOGIX_SUMMARY_TXT = '/Users/rozsagyene/accounting-app/logix-statement-summary.txt';

// ============================================================================
// BANK OF AMERICA PARSER
// ============================================================================

function parseBOAExcel() {
  console.log('\n📊 Parsing Bank of America Excel...');

  const workbook = XLSX.readFile(BOA_EXCEL);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const transactions = [];
  let currentStatementPeriod = null;
  let accountNumber = null;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowStr = JSON.stringify(row);

    // Extract account number and statement period
    if (rowStr.includes('Account number:') || rowStr.includes('Account#')) {
      const match = rowStr.match(/(\d{4}\s*\d{4}\s*\d{4})/);
      if (match) {
        accountNumber = match[1].replace(/\s/g, '');
      }

      // Extract date range
      const dateMatch = rowStr.match(/(\w+\s+\d+,\s+\d{4})\s+to\s+(\w+\s+\d+,\s+\d{4})/);
      if (dateMatch) {
        currentStatementPeriod = `${dateMatch[1]} to ${dateMatch[2]}`;
      }
    }

    // Look for transaction rows - they typically have dates in Excel date format or MM/DD/YY format
    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const cell = row[colIdx];

      // Check if this cell looks like a date (Excel serial date or string date)
      let transactionDate = null;

      // Excel serial date (number > 40000 means dates after 2009)
      if (typeof cell === 'number' && cell > 40000 && cell < 60000) {
        const excelDate = XLSX.SSF.parse_date_code(cell);
        if (excelDate) {
          transactionDate = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
        }
      }

      // String date format MM/DD/YY or MM/DD/YYYY
      if (typeof cell === 'string') {
        const dateMatch = cell.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (dateMatch) {
          let year = parseInt(dateMatch[3]);
          if (year < 100) year += 2000; // Convert 23 to 2023
          transactionDate = new Date(year, parseInt(dateMatch[1]) - 1, parseInt(dateMatch[2]));
        }
      }

      if (transactionDate && !isNaN(transactionDate)) {
        // Found a transaction date, now look for description and amount in nearby cells
        let description = '';
        let amount = null;

        // Look ahead for description (usually next 1-3 columns)
        for (let j = colIdx + 1; j < Math.min(colIdx + 5, row.length); j++) {
          if (typeof row[j] === 'string' && row[j].trim().length > 3) {
            description = row[j].trim();
            break;
          }
        }

        // Look for amount (usually last column with number, or near description)
        for (let j = row.length - 1; j >= 0; j--) {
          const val = row[j];
          if (typeof val === 'number' && val !== cell && Math.abs(val) > 0.01) {
            amount = val;
            break;
          }
          if (typeof val === 'string') {
            // Try parsing string like "$1,234.56" or "-1234.56"
            const numMatch = val.match(/[-]?\$?[\d,]+\.?\d*/);
            if (numMatch) {
              const parsed = parseFloat(numMatch[0].replace(/[$,]/g, ''));
              if (!isNaN(parsed) && Math.abs(parsed) > 0.01) {
                amount = parsed;
                break;
              }
            }
          }
        }

        if (description && amount !== null) {
          transactions.push({
            date: transactionDate.toISOString().split('T')[0],
            description,
            amount: Math.abs(amount),
            type: amount < 0 ? 'DISBURSEMENT' : 'RECEIPT',
            source: 'Bank of America',
            accountNumber,
            statementPeriod: currentStatementPeriod,
          });
        }
      }
    }
  }

  console.log(`✅ Found ${transactions.length} Bank of America transactions`);
  return transactions;
}

// ============================================================================
// LOGIX PARSER
// ============================================================================

function parseLogixStatements() {
  console.log('\n📊 Parsing Logix statements...');

  const transactions = [];

  // Parse both Logix files
  const files = [LOGIX_FULL_TXT, LOGIX_SUMMARY_TXT];

  files.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      // Match patterns like:
      // "04/01/24  Logix Deposit dividend 6  $75.99"
      // "Logix Deposit dividend 25  $379.58"
      const match = line.match(/(\d{2}\/\d{2}\/\d{2,4})\s+(.*?)\s+\$?([\d,]+\.\d{2})/);

      if (match) {
        const [, dateStr, desc, amountStr] = match;

        // Parse date
        const [month, day, year] = dateStr.split('/');
        let fullYear = parseInt(year);
        if (fullYear < 100) fullYear += 2000;
        const date = new Date(fullYear, parseInt(month) - 1, parseInt(day));

        // Parse amount
        const amount = parseFloat(amountStr.replace(/,/g, ''));

        if (!isNaN(date) && !isNaN(amount)) {
          transactions.push({
            date: date.toISOString().split('T')[0],
            description: desc.trim(),
            amount,
            type: 'RECEIPT', // Logix dividends are receipts
            source: 'Logix Federal Credit Union',
            accountNumber: '449444600',
          });
        }
      }
    }
  });

  console.log(`✅ Found ${transactions.length} Logix transactions`);
  return transactions;
}

// ============================================================================
// DATABASE QUERY (DISABLED - no database available)
// ============================================================================

async function getExistingTransactions() {
  console.log('\n⚠️  Database not configured - skipping database query');
  console.log('   The report will show all bank statement transactions');
  return [];
}

// ============================================================================
// RECONCILIATION
// ============================================================================

function reconcile(bankTransactions, dbTransactions) {
  console.log('\n🔍 Reconciling transactions...');

  const missing = [];
  const matched = [];
  const unmatched = [];

  // For each bank transaction, try to find a match in the database
  bankTransactions.forEach(bankTxn => {
    const matches = dbTransactions.filter(dbTxn => {
      // Match criteria:
      // 1. Same date (or within 1-2 days for processing delays)
      const dateDiff = Math.abs(new Date(bankTxn.date) - new Date(dbTxn.date)) / (1000 * 60 * 60 * 24);
      if (dateDiff > 3) return false;

      // 2. Same amount (exact match)
      if (Math.abs(bankTxn.amount - dbTxn.amount) > 0.01) return false;

      // 3. Similar description (partial match)
      const bankDesc = bankTxn.description.toLowerCase();
      const dbDesc = dbTxn.description.toLowerCase();

      // Check if descriptions have significant overlap
      const bankWords = bankDesc.split(/\s+/).filter(w => w.length > 3);
      const dbWords = dbDesc.split(/\s+/).filter(w => w.length > 3);

      const commonWords = bankWords.filter(w => dbWords.includes(w));
      if (commonWords.length > 0) return true;

      // Also check if one description contains the other
      if (bankDesc.includes(dbDesc) || dbDesc.includes(bankDesc)) return true;

      return false;
    });

    if (matches.length > 0) {
      matched.push({
        bank: bankTxn,
        db: matches[0],
      });
    } else {
      missing.push(bankTxn);
    }
  });

  // Find database transactions that don't match any bank transaction
  dbTransactions.forEach(dbTxn => {
    const isMatched = matched.some(m => m.db.id === dbTxn.id);
    if (!isMatched) {
      unmatched.push(dbTxn);
    }
  });

  return { missing, matched, unmatched };
}

// ============================================================================
// REPORT
// ============================================================================

function generateReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📋 BANK STATEMENT RECONCILIATION REPORT');
  console.log('='.repeat(80));

  console.log(`\n✅ Matched: ${results.matched.length} transactions`);
  console.log(`❌ Missing from database: ${results.missing.length} transactions`);
  console.log(`⚠️  In database but not in bank statements: ${results.unmatched.length} transactions`);

  if (results.missing.length > 0) {
    console.log('\n' + '─'.repeat(80));
    console.log('❌ MISSING FROM DATABASE (found in bank statements):');
    console.log('─'.repeat(80));

    results.missing.forEach((txn, idx) => {
      console.log(`\n${idx + 1}. [${txn.source}]`);
      console.log(`   Date: ${txn.date}`);
      console.log(`   Description: ${txn.description}`);
      console.log(`   Amount: $${txn.amount.toFixed(2)} (${txn.type})`);
      if (txn.accountNumber) console.log(`   Account: ${txn.accountNumber}`);
    });
  }

  if (results.unmatched.length > 0) {
    console.log('\n' + '─'.repeat(80));
    console.log('⚠️  IN DATABASE BUT NOT IN BANK STATEMENTS:');
    console.log('─'.repeat(80));

    results.unmatched.forEach((txn, idx) => {
      console.log(`\n${idx + 1}. [DB ID: ${txn.id}]`);
      console.log(`   Date: ${txn.date}`);
      console.log(`   Description: ${txn.description}`);
      console.log(`   Amount: $${txn.amount.toFixed(2)} (${txn.type})`);
      if (txn.checkNumber) console.log(`   Check #: ${txn.checkNumber}`);
    });
  }

  // Summary by source
  console.log('\n' + '─'.repeat(80));
  console.log('📊 SUMMARY BY SOURCE:');
  console.log('─'.repeat(80));

  const missingBySource = {};
  results.missing.forEach(txn => {
    missingBySource[txn.source] = (missingBySource[txn.source] || 0) + 1;
  });

  Object.entries(missingBySource).forEach(([source, count]) => {
    console.log(`${source}: ${count} missing transactions`);
  });

  console.log('\n' + '='.repeat(80));

  // Save detailed report to file
  const reportPath = '/Users/rozsagyene/accounting-app/reconciliation-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Detailed report saved to: ${reportPath}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  try {
    console.log('🚀 Starting bank statement reconciliation...\n');

    // Parse bank statements
    const boaTransactions = parseBOAExcel();
    const logixTransactions = parseLogixStatements();
    const allBankTransactions = [...boaTransactions, ...logixTransactions];

    console.log(`\n📈 Total bank transactions: ${allBankTransactions.length}`);

    // Get database transactions
    const dbTransactions = await getExistingTransactions();

    // Reconcile
    const results = reconcile(allBankTransactions, dbTransactions);

    // Generate report
    generateReport(results);

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

main();
