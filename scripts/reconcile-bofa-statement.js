#!/usr/bin/env node
// Comprehensive Bank of America statement reconciliation script
// Extracts ALL transactions and statement summaries from text file

const fs = require('fs');
const path = require('path');

const filePath = process.argv[2] || '/Users/rozsagyene/Downloads/drexler bank statemetns 2023-2025.txt';

console.log('═'.repeat(80));
console.log('BANK OF AMERICA STATEMENT RECONCILIATION');
console.log('═'.repeat(80));
console.log(`\nReading: ${filePath}\n`);

const content = fs.readFileSync(filePath, 'utf8');

// ============================================================================
// STEP 1: Extract Statement Periods and Summaries
// ============================================================================

console.log('STEP 1: Extracting Statement Periods\n' + '-'.repeat(40));

// Match statement periods: "for August 23, 2023 to September 20, 2023"
const periodMatches = [...content.matchAll(/for\s+(\w+\s+\d{1,2},\s+\d{4})\s+to\s+(\w+\s+\d{1,2},\s+\d{4})/gi)];

console.log(`Found ${periodMatches.length} statement periods`);
periodMatches.forEach((m, i) => {
  console.log(`  ${i+1}. ${m[1]} to ${m[2]}`);
});

// ============================================================================
// STEP 2: Extract Account Summaries per period
// ============================================================================

console.log('\n\nSTEP 2: Extracting Account Summaries\n' + '-'.repeat(40));

// Look for summary lines like:
// "Beginning balance on August 23, 2023 $510,908.55"
// "Deposits and other additions 29,375.31"
// "Ending balance on September 20, 2023 $524,418.71"

const beginningMatches = [...content.matchAll(/Beginning balance[^$]*\$?([\d,]+\.\d{2})/gi)];
const endingMatches = [...content.matchAll(/Ending balance[^$]*\$?([\d,]+\.\d{2})/gi)];
const depositSummaryMatches = [...content.matchAll(/(?:Total )?[Dd]eposits and ot?her additions[^$]*\$?([\d,]+\.\d{2})/gi)];
const withdrawalSummaryMatches = [...content.matchAll(/ATM and debit card subtractio?ns[^-]*(-[\d,]+\.\d{2})/gi)];
const checkSummaryMatches = [...content.matchAll(/Checks[^-]*(-[\d,]+\.\d{2})/gi)];
const otherSubMatches = [...content.matchAll(/Ot?her subt?ractions[^-]*(-[\d,]+\.\d{2})/gi)];

console.log(`Beginning balances found: ${beginningMatches.length}`);
console.log(`Ending balances found: ${endingMatches.length}`);
console.log(`Deposit summaries found: ${depositSummaryMatches.length}`);

// Calculate expected totals from summaries
let totalDepositsFromSummary = 0;
let totalATMWithdrawalsFromSummary = 0;
let totalChecksFromSummary = 0;
let totalOtherSubFromSummary = 0;

depositSummaryMatches.forEach(m => {
  totalDepositsFromSummary += parseFloat(m[1].replace(/,/g, ''));
});

withdrawalSummaryMatches.forEach(m => {
  totalATMWithdrawalsFromSummary += parseFloat(m[1].replace(/,/g, ''));
});

checkSummaryMatches.forEach(m => {
  totalChecksFromSummary += parseFloat(m[1].replace(/,/g, ''));
});

otherSubMatches.forEach(m => {
  totalOtherSubFromSummary += parseFloat(m[1].replace(/,/g, ''));
});

console.log(`\nStatement Summary Totals (from headers):`);
console.log(`  Total Deposits: $${totalDepositsFromSummary.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`  Total ATM/Debit Card: $${totalATMWithdrawalsFromSummary.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`  Total Checks: $${totalChecksFromSummary.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`  Total Other Subtractions: $${totalOtherSubFromSummary.toLocaleString('en-US', {minimumFractionDigits: 2})}`);

const totalWithdrawalsFromSummary = totalATMWithdrawalsFromSummary + totalChecksFromSummary + totalOtherSubFromSummary;
console.log(`  TOTAL WITHDRAWALS: $${totalWithdrawalsFromSummary.toLocaleString('en-US', {minimumFractionDigits: 2})}`);

// ============================================================================
// STEP 3: Extract Individual Transactions
// ============================================================================

console.log('\n\nSTEP 3: Extracting Individual Transactions\n' + '-'.repeat(40));

const allTransactions = [];
const allChecks = [];

// Multiple regex patterns to capture different transaction formats

// Pattern 1: Standard transaction line
// Date Description Amount
// e.g., "08/23/23 GELSON'S MARKE 08/22 11000936032 PURCHASEGELSON'S MARKETS VALLEY VILLAG CA -41.76"
const standardTxRegex = /(\d{2}\/\d{2}\/\d{2})\s+([A-Z][A-Za-z0-9\s\.\-\*\#\'\,\/\&\(\)]+?)\s+(-?[\d,]+\.\d{2})(?=\s+\d{2}\/|\s*$|\s+I\s|\s+,|\s+Total|\s+continued)/g;

// Pattern 2: CHECKCARD/PURCHASE transactions (more specific)
const cardTxRegex = /(\d{2}\/\d{2}\/\d{2})\s+((?:CHECKCARD|CHECK CARD|PURCHASE)[^\d]*?[\d\s]+[A-Z][A-Za-z\s\.\-\*\#\'\,\/\&\(\)]+?)\s+(-?[\d,]+\.\d{2})/gi;

// Pattern 3: Wire transfers
const wireTxRegex = /(\d{2}\/\d{2}\/\d{2})\s+(WIRE TYPE:[^\d]+(?:[\d\.]+[A-Z]*\s*)+)\s+([\d,]+\.\d{2})/gi;

// Pattern 4: SSA/Social Security
const ssaTxRegex = /(\d{2}\/\d{2}\/\d{2})\s+(SSA TREAS[^$]+?)\s+([\d,]+\.\d{2})/gi;

// Pattern 5: Interest
const interestTxRegex = /(\d{2}\/\d{2}\/\d{2})\s+(Interest (?:Earned|Paid)[^\d]*)\s+([\d,]+\.\d{2})/gi;

// Pattern 6: Utility bills (SOCALGAS, LADWP, ATT)
const utilityTxRegex = /(\d{2}\/\d{2}\/\d{2})\s+((?:SOCALGAS|LADWP|ATT)[^-]+?)\s+(-[\d,]+\.\d{2})/gi;

// Pattern 7: Checks - Format: "MM/DD/YY Check# NNN Description -Amount"
const checkTxRegex = /(\d{2}\/\d{2}\/\d{2})[,\s]*(\d{3})\*?\s*[^\d-]*\s*(-[\d,]+\.\d{2})/g;

// Helper to add transaction
function addTransaction(date, description, amountStr, type = 'unknown') {
  const [month, day, year] = date.split('/').map(Number);
  const fullYear = 2000 + year;

  // Validate date range
  if (fullYear < 2023 || fullYear > 2025) return;

  const amount = parseFloat(amountStr.replace(/,/g, ''));

  // Skip very large amounts (balance lines)
  if (Math.abs(amount) > 50000) return;

  // Clean description
  description = description.replace(/\s+/g, ' ').trim();

  // Skip if too short or garbage
  if (description.length < 3) return;
  if (!/[a-zA-Z]{3,}/.test(description)) return;

  const key = `${date}|${amount.toFixed(2)}`;

  // Dedupe
  if (!allTransactions.some(t => `${t.date}|${t.amount.toFixed(2)}` === key)) {
    allTransactions.push({
      date,
      fullDate: new Date(fullYear, month - 1, day),
      description: description.substring(0, 100),
      amount,
      type
    });
  }
}

// Run all patterns
let match;

// Standard transactions
while ((match = standardTxRegex.exec(content)) !== null) {
  addTransaction(match[1], match[2], match[3]);
}

// Card transactions
while ((match = cardTxRegex.exec(content)) !== null) {
  addTransaction(match[1], match[2], match[3], 'card');
}

// Wire transfers
while ((match = wireTxRegex.exec(content)) !== null) {
  addTransaction(match[1], match[2], match[3], 'wire');
}

// SSA
while ((match = ssaTxRegex.exec(content)) !== null) {
  addTransaction(match[1], match[2], match[3], 'ssa');
}

// Interest
while ((match = interestTxRegex.exec(content)) !== null) {
  addTransaction(match[1], match[2], match[3], 'interest');
}

// Utilities
while ((match = utilityTxRegex.exec(content)) !== null) {
  addTransaction(match[1], match[2], match[3], 'utility');
}

// Checks (separate handling)
while ((match = checkTxRegex.exec(content)) !== null) {
  const [month, day, year] = match[1].split('/').map(Number);
  const fullYear = 2000 + year;
  if (fullYear >= 2023 && fullYear <= 2025) {
    const checkNum = match[2];
    const amount = parseFloat(match[3].replace(/,/g, ''));

    if (!allChecks.some(c => c.checkNum === checkNum && Math.abs(c.amount - amount) < 0.01)) {
      allChecks.push({
        date: match[1],
        fullDate: new Date(fullYear, month - 1, day),
        checkNum,
        amount,
        type: 'check'
      });
    }
  }
}

// Sort transactions by date
allTransactions.sort((a, b) => a.fullDate - b.fullDate);
allChecks.sort((a, b) => a.fullDate - b.fullDate);

console.log(`\nExtracted Transactions:`);
console.log(`  Regular transactions: ${allTransactions.length}`);
console.log(`  Checks: ${allChecks.length}`);

// ============================================================================
// STEP 4: Calculate Totals from Extracted Transactions
// ============================================================================

console.log('\n\nSTEP 4: Transaction Analysis\n' + '-'.repeat(40));

const deposits = allTransactions.filter(t => t.amount > 0);
const withdrawals = allTransactions.filter(t => t.amount < 0);

const totalDepositsExtracted = deposits.reduce((s, t) => s + t.amount, 0);
const totalWithdrawalsExtracted = withdrawals.reduce((s, t) => s + t.amount, 0);
const totalChecksExtracted = allChecks.reduce((s, c) => s + c.amount, 0);

console.log(`\nExtracted Totals:`);
console.log(`  Deposits: ${deposits.length} transactions = $${totalDepositsExtracted.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`  Withdrawals: ${withdrawals.length} transactions = $${totalWithdrawalsExtracted.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`  Checks: ${allChecks.length} checks = $${totalChecksExtracted.toLocaleString('en-US', {minimumFractionDigits: 2})}`);

const totalExtracted = totalDepositsExtracted + totalWithdrawalsExtracted + totalChecksExtracted;
console.log(`  NET TOTAL: $${totalExtracted.toLocaleString('en-US', {minimumFractionDigits: 2})}`);

// ============================================================================
// STEP 5: Reconciliation Report
// ============================================================================

console.log('\n\n' + '═'.repeat(80));
console.log('RECONCILIATION SUMMARY');
console.log('═'.repeat(80));

console.log('\n                              STATEMENT      EXTRACTED     DIFFERENCE');
console.log('                              SUMMARY        TRANSACTIONS');
console.log('-'.repeat(80));

const depositDiff = totalDepositsFromSummary - totalDepositsExtracted;
console.log(`Deposits:                     $${totalDepositsFromSummary.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${totalDepositsExtracted.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${depositDiff.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}`);

const withdrawalDiff = totalATMWithdrawalsFromSummary - totalWithdrawalsExtracted;
console.log(`ATM/Card Withdrawals:         $${totalATMWithdrawalsFromSummary.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${totalWithdrawalsExtracted.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${withdrawalDiff.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}`);

const checkDiff = totalChecksFromSummary - totalChecksExtracted;
console.log(`Checks:                       $${totalChecksFromSummary.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${totalChecksExtracted.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${checkDiff.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}`);

console.log('-'.repeat(80));

// ============================================================================
// STEP 6: Show Sample Transactions
// ============================================================================

console.log('\n\n' + '═'.repeat(80));
console.log('SAMPLE TRANSACTIONS');
console.log('═'.repeat(80));

console.log('\n--- First 20 Deposits ---');
deposits.slice(0, 20).forEach((t, i) => {
  console.log(`${String(i+1).padStart(3)}. ${t.date} | $${t.amount.toFixed(2).padStart(12)} | ${t.description.substring(0, 50)}`);
});

console.log('\n--- First 20 Withdrawals ---');
withdrawals.slice(0, 20).forEach((t, i) => {
  console.log(`${String(i+1).padStart(3)}. ${t.date} | $${t.amount.toFixed(2).padStart(12)} | ${t.description.substring(0, 50)}`);
});

console.log('\n--- First 20 Checks ---');
allChecks.slice(0, 20).forEach((c, i) => {
  console.log(`${String(i+1).padStart(3)}. ${c.date} | Check #${c.checkNum} | $${c.amount.toFixed(2).padStart(12)}`);
});

// ============================================================================
// STEP 7: Save to JSON for further analysis
// ============================================================================

const output = {
  summary: {
    statementPeriods: periodMatches.length,
    firstPeriod: periodMatches[0] ? `${periodMatches[0][1]} to ${periodMatches[0][2]}` : null,
    lastPeriod: periodMatches[periodMatches.length-1] ? `${periodMatches[periodMatches.length-1][1]} to ${periodMatches[periodMatches.length-1][2]}` : null,
    fromStatementHeaders: {
      totalDeposits: totalDepositsFromSummary,
      totalATMWithdrawals: totalATMWithdrawalsFromSummary,
      totalChecks: totalChecksFromSummary,
      totalOtherSubtractions: totalOtherSubFromSummary,
    },
    extracted: {
      depositCount: deposits.length,
      depositTotal: totalDepositsExtracted,
      withdrawalCount: withdrawals.length,
      withdrawalTotal: totalWithdrawalsExtracted,
      checkCount: allChecks.length,
      checkTotal: totalChecksExtracted,
    },
    differences: {
      deposits: depositDiff,
      withdrawals: withdrawalDiff,
      checks: checkDiff,
    }
  },
  transactions: allTransactions,
  checks: allChecks,
};

const outputPath = path.join(__dirname, '..', 'bofa-reconciliation.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\n\nSaved detailed data to: ${outputPath}`);
