#!/usr/bin/env node
// Compare Azure-parsed transactions to Bank Statement summary totals
// This will tell us if Azure missed any transactions

const fs = require('fs');

console.log('═'.repeat(80));
console.log('AZURE vs BANK STATEMENT COMPARISON');
console.log('═'.repeat(80));

// Load Azure parsed data
const azureData = JSON.parse(fs.readFileSync('azure-raw-response.json', 'utf8'));
console.log(`\nAzure parsed: ${azureData.tableCount} tables, ${azureData.paragraphCount} paragraphs`);

// ============================================================================
// STEP 1: Extract statement summary totals from Azure tables
// ============================================================================

console.log('\n\nSTEP 1: Extracting Statement Summaries from Azure\n' + '-'.repeat(60));

const summaryTables = [];
const transactionTables = [];

for (const table of azureData.tables) {
  const cellText = table.cells.join(' ').toLowerCase();

  // Identify summary tables (have "beginning balance" or "ending balance")
  if (cellText.includes('beginning balance') || cellText.includes('ending balance')) {
    summaryTables.push(table);
  }
  // Identify transaction tables (have dates in MM/DD/YY format)
  else if (table.cells.some(c => /\d{2}\/\d{2}\/\d{2}/.test(c))) {
    transactionTables.push(table);
  }
}

console.log(`Summary tables found: ${summaryTables.length}`);
console.log(`Transaction tables found: ${transactionTables.length}`);

// Extract totals from summary tables
let totalDepositsFromSummary = 0;
let totalATMDebitFromSummary = 0;
let totalChecksFromSummary = 0;
let totalOtherSubFromSummary = 0;
let totalServiceFeesFromSummary = 0;

for (const table of summaryTables) {
  for (let i = 0; i < table.cells.length - 1; i++) {
    const label = table.cells[i].toLowerCase();
    const valueStr = table.cells[i + 1];
    const value = parseFloat(valueStr.replace(/[$,]/g, ''));

    if (isNaN(value)) continue;

    if (label.includes('deposits') && label.includes('addition')) {
      totalDepositsFromSummary += value;
    } else if (label.includes('atm') && label.includes('debit')) {
      totalATMDebitFromSummary += value;
    } else if (label === 'checks' || label.includes('checks\n')) {
      totalChecksFromSummary += value;
    } else if (label.includes('other') && label.includes('subtraction')) {
      totalOtherSubFromSummary += value;
    } else if (label.includes('service fee')) {
      totalServiceFeesFromSummary += value;
    }
  }
}

console.log(`\nStatement Summary Totals (from ${summaryTables.length} summary tables):`);
console.log(`  Deposits & Additions:    $${totalDepositsFromSummary.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`  ATM/Debit Subtractions:  $${totalATMDebitFromSummary.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`  Checks:                  $${totalChecksFromSummary.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`  Other Subtractions:      $${totalOtherSubFromSummary.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`  Service Fees:            $${totalServiceFeesFromSummary.toLocaleString('en-US', {minimumFractionDigits: 2})}`);

const totalWithdrawalsFromSummary = totalATMDebitFromSummary + totalChecksFromSummary + totalOtherSubFromSummary + totalServiceFeesFromSummary;
console.log(`  TOTAL WITHDRAWALS:       $${totalWithdrawalsFromSummary.toLocaleString('en-US', {minimumFractionDigits: 2})}`);

// ============================================================================
// STEP 2: Extract all transactions from Azure tables
// ============================================================================

console.log('\n\nSTEP 2: Extracting Individual Transactions from Azure\n' + '-'.repeat(60));

const transactions = [];
const checkTransactions = [];

for (const table of transactionTables) {
  const cols = table.cols;
  const cells = table.cells;

  // Process table row by row
  for (let i = 0; i < cells.length; i += cols) {
    const rowCells = cells.slice(i, i + cols);
    const rowText = rowCells.join(' ');

    // Skip header rows
    if (rowText.toLowerCase().includes('description') && rowText.toLowerCase().includes('amount')) continue;
    if (rowText.toLowerCase().includes('date') && !rowText.match(/\d{2}\/\d{2}\/\d{2}/)) continue;

    // Find date and amount in this row
    let date = null;
    let description = '';
    let amount = null;

    for (const cell of rowCells) {
      // Look for date
      const dateMatch = cell.match(/(\d{2}\/\d{2}\/\d{2})/);
      if (dateMatch && !date) {
        date = dateMatch[1];
      }

      // Look for amount (last number in row, may have - sign)
      const amountMatch = cell.match(/^-?[\d,]+\.\d{2}$/);
      if (amountMatch) {
        amount = parseFloat(cell.replace(/,/g, ''));
      }

      // Build description from non-date, non-amount cells
      if (!cell.match(/^\d{2}\/\d{2}\/\d{2}/) && !cell.match(/^-?[\d,]+\.\d{2}$/) && cell.length > 2) {
        // Skip row markers like "1", "-", "."
        if (!/^[1\-\.\,\*\›\·]$/.test(cell.trim())) {
          description += ' ' + cell;
        }
      }
    }

    if (date && amount !== null) {
      description = description.trim();

      // Determine transaction type
      const descLower = description.toLowerCase();
      let type = 'other';
      if (descLower.includes('check #') || /^check\s*#?\d+/.test(descLower)) {
        type = 'check';
      } else if (descLower.includes('checkcard') || descLower.includes('purchase')) {
        type = 'debit_card';
      } else if (descLower.includes('wire')) {
        type = 'wire';
      } else if (descLower.includes('ssa treas') || descLower.includes('soc sec')) {
        type = 'ssa';
      } else if (descLower.includes('interest')) {
        type = 'interest';
      }

      transactions.push({ date, description, amount, type });
    }
  }
}

// Also look for check tables (Date | Check # | Amount format)
for (const table of azureData.tables) {
  const cellText = table.cells.join(' ').toLowerCase();
  if (cellText.includes('check #') || cellText.includes('check#')) {
    const cells = table.cells;
    const cols = table.cols;

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      // Look for check numbers (3 digits)
      const checkMatch = cell.match(/^(\d{3})\*?$/);
      if (checkMatch) {
        // Find associated date and amount
        // Usually in same row or nearby cells
        let date = null;
        let amount = null;

        // Look backwards for date
        for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
          const dateMatch = cells[j].match(/(\d{2}\/\d{2}\/\d{2})/);
          if (dateMatch) {
            date = dateMatch[1];
            break;
          }
        }

        // Look forwards for amount
        for (let j = i + 1; j <= Math.min(cells.length - 1, i + 3); j++) {
          const amountMatch = cells[j].match(/^-?[\d,]+\.\d{2}$/);
          if (amountMatch) {
            amount = parseFloat(cells[j].replace(/,/g, ''));
            break;
          }
        }

        if (date && amount !== null) {
          const checkNum = checkMatch[1];
          if (!checkTransactions.some(c => c.checkNum === checkNum && Math.abs(c.amount - amount) < 0.01)) {
            checkTransactions.push({ date, checkNum, amount, type: 'check' });
          }
        }
      }
    }
  }
}

console.log(`\nTransactions extracted from Azure:`);
console.log(`  Regular transactions: ${transactions.length}`);
console.log(`  Check transactions: ${checkTransactions.length}`);

// ============================================================================
// STEP 3: Calculate totals from extracted transactions
// ============================================================================

console.log('\n\nSTEP 3: Calculating Azure Transaction Totals\n' + '-'.repeat(60));

const deposits = transactions.filter(t => t.amount > 0);
const withdrawals = transactions.filter(t => t.amount < 0);

const totalDepositsExtracted = deposits.reduce((s, t) => s + t.amount, 0);
const totalWithdrawalsExtracted = withdrawals.reduce((s, t) => s + t.amount, 0);
const totalChecksExtracted = checkTransactions.reduce((s, c) => s + c.amount, 0);

// Separate ATM/debit card from other withdrawals
const atmDebitWithdrawals = withdrawals.filter(t =>
  t.type === 'debit_card' ||
  t.description.toLowerCase().includes('checkcard') ||
  t.description.toLowerCase().includes('purchase')
);
const otherWithdrawals = withdrawals.filter(t =>
  t.type !== 'debit_card' &&
  !t.description.toLowerCase().includes('checkcard') &&
  !t.description.toLowerCase().includes('purchase')
);

const totalATMDebitExtracted = atmDebitWithdrawals.reduce((s, t) => s + t.amount, 0);
const totalOtherExtracted = otherWithdrawals.reduce((s, t) => s + t.amount, 0);

console.log(`\nAzure Extracted Totals:`);
console.log(`  Deposits:           ${deposits.length} transactions = $${totalDepositsExtracted.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`  ATM/Debit:          ${atmDebitWithdrawals.length} transactions = $${totalATMDebitExtracted.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`  Other Withdrawals:  ${otherWithdrawals.length} transactions = $${totalOtherExtracted.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`  Checks:             ${checkTransactions.length} checks = $${totalChecksExtracted.toLocaleString('en-US', {minimumFractionDigits: 2})}`);

// ============================================================================
// STEP 4: Reconciliation
// ============================================================================

console.log('\n\n' + '═'.repeat(80));
console.log('RECONCILIATION REPORT');
console.log('═'.repeat(80));

console.log('\n                              STATEMENT      AZURE         DIFFERENCE');
console.log('                              SUMMARY        EXTRACTED');
console.log('-'.repeat(80));

const depositDiff = totalDepositsFromSummary - totalDepositsExtracted;
console.log(`Deposits:                     $${totalDepositsFromSummary.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${totalDepositsExtracted.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${depositDiff.toLocaleString('en-US', {minimumFractionDigits: 2, signDisplay: 'always'}).padStart(12)}`);

const atmDiff = totalATMDebitFromSummary - totalATMDebitExtracted;
console.log(`ATM/Debit Card:               $${totalATMDebitFromSummary.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${totalATMDebitExtracted.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${atmDiff.toLocaleString('en-US', {minimumFractionDigits: 2, signDisplay: 'always'}).padStart(12)}`);

const checkDiff = totalChecksFromSummary - totalChecksExtracted;
console.log(`Checks:                       $${totalChecksFromSummary.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${totalChecksExtracted.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${checkDiff.toLocaleString('en-US', {minimumFractionDigits: 2, signDisplay: 'always'}).padStart(12)}`);

const otherDiff = totalOtherSubFromSummary - totalOtherExtracted;
console.log(`Other Subtractions:           $${totalOtherSubFromSummary.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${totalOtherExtracted.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${otherDiff.toLocaleString('en-US', {minimumFractionDigits: 2, signDisplay: 'always'}).padStart(12)}`);

console.log('-'.repeat(80));

const totalSummary = totalDepositsFromSummary + totalWithdrawalsFromSummary;
const totalExtracted = totalDepositsExtracted + totalWithdrawalsExtracted + totalChecksExtracted;
const totalDiff = totalSummary - totalExtracted;

console.log(`NET TOTAL:                    $${totalSummary.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${totalExtracted.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${totalDiff.toLocaleString('en-US', {minimumFractionDigits: 2, signDisplay: 'always'}).padStart(12)}`);

// ============================================================================
// STEP 5: Identify potential issues
// ============================================================================

console.log('\n\n' + '═'.repeat(80));
console.log('POTENTIAL ISSUES');
console.log('═'.repeat(80));

if (Math.abs(depositDiff) > 1) {
  console.log(`\n⚠️  DEPOSITS: Missing $${Math.abs(depositDiff).toLocaleString('en-US', {minimumFractionDigits: 2})}`);
  console.log(`   Azure parsed ${deposits.length} deposits totaling $${totalDepositsExtracted.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
  console.log(`   Statement shows $${totalDepositsFromSummary.toLocaleString('en-US', {minimumFractionDigits: 2})} in deposits`);
}

if (Math.abs(atmDiff) > 1) {
  console.log(`\n⚠️  ATM/DEBIT: Missing $${Math.abs(atmDiff).toLocaleString('en-US', {minimumFractionDigits: 2})}`);
  console.log(`   Azure parsed ${atmDebitWithdrawals.length} card transactions totaling $${totalATMDebitExtracted.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
  console.log(`   Statement shows $${totalATMDebitFromSummary.toLocaleString('en-US', {minimumFractionDigits: 2})} in ATM/debit`);
}

if (Math.abs(checkDiff) > 1) {
  console.log(`\n⚠️  CHECKS: Missing $${Math.abs(checkDiff).toLocaleString('en-US', {minimumFractionDigits: 2})}`);
  console.log(`   Azure parsed ${checkTransactions.length} checks totaling $${totalChecksExtracted.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
  console.log(`   Statement shows $${totalChecksFromSummary.toLocaleString('en-US', {minimumFractionDigits: 2})} in checks`);
}

if (Math.abs(totalDiff) < 1) {
  console.log('\n✅ RECONCILED: Azure extracted transactions match statement totals!');
}

// ============================================================================
// Save results
// ============================================================================

const output = {
  statementSummary: {
    deposits: totalDepositsFromSummary,
    atmDebit: totalATMDebitFromSummary,
    checks: totalChecksFromSummary,
    otherSubtractions: totalOtherSubFromSummary,
    serviceFees: totalServiceFeesFromSummary,
    totalWithdrawals: totalWithdrawalsFromSummary,
  },
  azureExtracted: {
    depositCount: deposits.length,
    depositTotal: totalDepositsExtracted,
    atmDebitCount: atmDebitWithdrawals.length,
    atmDebitTotal: totalATMDebitExtracted,
    otherWithdrawalCount: otherWithdrawals.length,
    otherWithdrawalTotal: totalOtherExtracted,
    checkCount: checkTransactions.length,
    checkTotal: totalChecksExtracted,
  },
  differences: {
    deposits: depositDiff,
    atmDebit: atmDiff,
    checks: checkDiff,
    other: otherDiff,
    net: totalDiff,
  },
  transactions: transactions,
  checks: checkTransactions,
};

fs.writeFileSync('azure-vs-statement.json', JSON.stringify(output, null, 2));
console.log('\n\nDetailed results saved to: azure-vs-statement.json');
