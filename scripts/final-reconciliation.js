#!/usr/bin/env node
// Final reconciliation report - Azure vs Bank Statement

const fs = require('fs');

console.log('═'.repeat(80));
console.log('FINAL RECONCILIATION REPORT: AZURE PARSING vs BANK STATEMENT');
console.log('═'.repeat(80));

const data = JSON.parse(fs.readFileSync('azure-raw-response.json', 'utf8'));

// ============================================================================
// 1. EXTRACT STATEMENT SUMMARIES (these are the "truth")
// ============================================================================

let periodSummaries = [];
let currentPeriod = null;

for (const table of data.tables) {
  const cells = table.cells;
  const cellText = cells.join(' ').toLowerCase();

  // Summary tables have beginning/ending balance
  if (cellText.includes('beginning balance') && cellText.includes('ending balance')) {
    let summary = { deposits: 0, atmDebit: 0, checks: 0, otherSub: 0, fees: 0 };

    for (let i = 0; i < cells.length - 1; i++) {
      const label = cells[i].toLowerCase();
      const val = parseFloat(cells[i + 1].replace(/[$,]/g, ''));
      if (isNaN(val)) continue;

      if (label.includes('beginning balance')) summary.beginBalance = val;
      else if (label.includes('ending balance')) summary.endBalance = val;
      else if (label.includes('deposits') && label.includes('addition')) summary.deposits = val;
      else if (label.includes('atm') && label.includes('debit')) summary.atmDebit = val;
      else if (label === 'checks' || label.match(/^checks$/)) summary.checks = val;
      else if (label.includes('other') && label.includes('subtraction')) summary.otherSub = val;
      else if (label.includes('service fee')) summary.fees = val;
    }

    if (summary.beginBalance || summary.endBalance) {
      periodSummaries.push(summary);
    }
  }
}

// Calculate totals from summaries
const totals = {
  deposits: periodSummaries.reduce((s, p) => s + (p.deposits || 0), 0),
  atmDebit: periodSummaries.reduce((s, p) => s + (p.atmDebit || 0), 0),
  checks: periodSummaries.reduce((s, p) => s + (p.checks || 0), 0),
  otherSub: periodSummaries.reduce((s, p) => s + (p.otherSub || 0), 0),
  fees: periodSummaries.reduce((s, p) => s + (p.fees || 0), 0),
};

console.log(`\n1. STATEMENT SUMMARY TOTALS (from ${periodSummaries.length} periods)`);
console.log('-'.repeat(60));
console.log(`   Deposits & Additions:    $${totals.deposits.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`   ATM/Debit Card:          $${totals.atmDebit.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`   Checks:                  $${totals.checks.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`   Other Subtractions:      $${totals.otherSub.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`   Service Fees:            $${totals.fees.toLocaleString('en-US', {minimumFractionDigits: 2})}`);

const totalWithdrawals = totals.atmDebit + totals.checks + totals.otherSub + totals.fees;
console.log(`   ─────────────────────────`);
console.log(`   TOTAL WITHDRAWALS:       $${totalWithdrawals.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`   NET CHANGE:              $${(totals.deposits + totalWithdrawals).toLocaleString('en-US', {minimumFractionDigits: 2})}`);

// ============================================================================
// 2. EXTRACT CHECKS FROM AZURE
// ============================================================================

const checks = [];

for (const table of data.tables) {
  const cells = table.cells;
  const cellText = cells.join(' ');

  if (cellText.includes('Check #') || cellText.includes('Check#')) {
    const cols = table.cols;

    for (let i = 0; i < cells.length; i += cols) {
      const row = cells.slice(i, i + cols);
      const rowText = row.join(' ');

      if (rowText.toLowerCase().includes('check #') && rowText.toLowerCase().includes('amount')) continue;

      const dateMatch = rowText.match(/(\d{2}\/\d{2}\/\d{2})/);
      const amountMatch = rowText.match(/(-?\d{1,3}(?:,\d{3})*\.\d{2})$/);

      if (dateMatch && amountMatch) {
        const date = dateMatch[1];
        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        const checkMatch = rowText.match(/(\d{3})\*?\s+[A-Za-z]/);
        const checkNum = checkMatch ? checkMatch[1] : null;

        const key = `${date}|${amount}`;
        if (!checks.some(c => `${c.date}|${c.amount}` === key)) {
          checks.push({ date, checkNum, amount, description: rowText.substring(10, 60) });
        }
      }
    }
  }
}

checks.sort((a, b) => {
  const [am, ad, ay] = a.date.split('/').map(Number);
  const [bm, bd, by] = b.date.split('/').map(Number);
  return new Date(2000 + ay, am - 1, ad) - new Date(2000 + by, bm - 1, bd);
});

const checkTotal = checks.reduce((s, c) => s + c.amount, 0);

console.log(`\n\n2. CHECKS EXTRACTED FROM AZURE`);
console.log('-'.repeat(60));
console.log(`   Found ${checks.length} checks`);
console.log(`   Total: $${checkTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`   Statement says: $${totals.checks.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`   DIFFERENCE: $${(totals.checks - checkTotal).toLocaleString('en-US', {minimumFractionDigits: 2})}`);

// ============================================================================
// 3. EXTRACT ALL OTHER TRANSACTIONS
// ============================================================================

const transactions = [];

for (const table of data.tables) {
  const cells = table.cells;
  const cols = table.cols;
  const cellText = cells.join(' ').toLowerCase();

  // Skip summary and check tables
  if (cellText.includes('beginning balance') || cellText.includes('ending balance')) continue;
  if (cellText.includes('check #')) continue;

  // Look for transaction tables (have Date/Description/Amount pattern)
  if (!cells.some(c => /\d{2}\/\d{2}\/\d{2}/.test(c))) continue;

  for (let i = 0; i < cells.length; i += cols) {
    const row = cells.slice(i, i + cols);
    const rowText = row.join(' ');

    if (rowText.toLowerCase().includes('description') && rowText.toLowerCase().includes('amount')) continue;

    let date = null, description = '', amount = null;

    for (const cell of row) {
      const dateMatch = cell.match(/(\d{2}\/\d{2}\/\d{2})/);
      if (dateMatch && !date) date = dateMatch[1];

      const amtMatch = cell.match(/^-?[\d,]+\.\d{2}$/);
      if (amtMatch) amount = parseFloat(cell.replace(/,/g, ''));

      if (!cell.match(/^\d{2}\/\d{2}\/\d{2}/) && !cell.match(/^-?[\d,]+\.\d{2}$/) && cell.length > 2) {
        if (!/^[1\-\.\,\*\›\·]$/.test(cell.trim())) {
          description += ' ' + cell;
        }
      }
    }

    if (date && amount !== null) {
      description = description.trim();
      const key = `${date}|${amount}`;

      if (!transactions.some(t => `${t.date}|${t.amount}` === key)) {
        transactions.push({ date, amount, description: description.substring(0, 80) });
      }
    }
  }
}

// Categorize transactions
const deposits = transactions.filter(t => t.amount > 0);
const cardTx = transactions.filter(t => t.amount < 0 && (
  t.description.toLowerCase().includes('checkcard') ||
  t.description.toLowerCase().includes('purchase')
));
const otherWithdrawals = transactions.filter(t => t.amount < 0 && !(
  t.description.toLowerCase().includes('checkcard') ||
  t.description.toLowerCase().includes('purchase')
));

const depositTotal = deposits.reduce((s, t) => s + t.amount, 0);
const cardTotal = cardTx.reduce((s, t) => s + t.amount, 0);
const otherTotal = otherWithdrawals.reduce((s, t) => s + t.amount, 0);

console.log(`\n\n3. OTHER TRANSACTIONS EXTRACTED FROM AZURE`);
console.log('-'.repeat(60));
console.log(`   Deposits: ${deposits.length} = $${depositTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`   ATM/Debit Card: ${cardTx.length} = $${cardTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`   Other Withdrawals: ${otherWithdrawals.length} = $${otherTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`);

// ============================================================================
// 4. RECONCILIATION
// ============================================================================

console.log('\n\n' + '═'.repeat(80));
console.log('RECONCILIATION');
console.log('═'.repeat(80));

console.log('\n                              STATEMENT      AZURE         DIFFERENCE');
console.log('-'.repeat(80));

const depositDiff = totals.deposits - depositTotal;
console.log(`Deposits:                     $${totals.deposits.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${depositTotal.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${depositDiff.toFixed(2).padStart(12)}`);

const cardDiff = totals.atmDebit - cardTotal;
console.log(`ATM/Debit Card:               $${totals.atmDebit.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${cardTotal.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${cardDiff.toFixed(2).padStart(12)}`);

const checkDiff = totals.checks - checkTotal;
console.log(`Checks:                       $${totals.checks.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${checkTotal.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${checkDiff.toFixed(2).padStart(12)}`);

const otherDiff = totals.otherSub - otherTotal;
console.log(`Other Subtractions:           $${totals.otherSub.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${otherTotal.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${otherDiff.toFixed(2).padStart(12)}`);

const feeDiff = totals.fees;
console.log(`Service Fees:                 $${totals.fees.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${(0).toFixed(2).padStart(12)}  $${feeDiff.toFixed(2).padStart(12)}`);

console.log('-'.repeat(80));

const statementNet = totals.deposits + totalWithdrawals;
const azureNet = depositTotal + cardTotal + checkTotal + otherTotal;
const netDiff = statementNet - azureNet;
console.log(`NET TOTAL:                    $${statementNet.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${azureNet.toLocaleString('en-US', {minimumFractionDigits: 2}).padStart(12)}  $${netDiff.toFixed(2).padStart(12)}`);

// ============================================================================
// 5. SUMMARY
// ============================================================================

console.log('\n\n' + '═'.repeat(80));
console.log('SUMMARY OF DISCREPANCIES');
console.log('═'.repeat(80));

const issues = [];
if (Math.abs(depositDiff) > 10) issues.push({ cat: 'Deposits', diff: depositDiff, count: deposits.length });
if (Math.abs(cardDiff) > 10) issues.push({ cat: 'ATM/Debit', diff: cardDiff, count: cardTx.length });
if (Math.abs(checkDiff) > 10) issues.push({ cat: 'Checks', diff: checkDiff, count: checks.length });
if (Math.abs(otherDiff) > 10) issues.push({ cat: 'Other', diff: otherDiff, count: otherWithdrawals.length });

if (issues.length === 0) {
  console.log('\n✅ All categories reconcile within $10');
} else {
  console.log('\n⚠️  The following categories have discrepancies:\n');
  issues.forEach(i => {
    const dir = i.diff > 0 ? 'MISSING from Azure' : 'EXTRA in Azure';
    console.log(`   ${i.cat}: $${Math.abs(i.diff).toLocaleString('en-US', {minimumFractionDigits: 2})} ${dir}`);
    console.log(`            (Azure found ${i.count} transactions)`);
  });
}

// Check sequence gaps
console.log('\n\n' + '═'.repeat(80));
console.log('CHECK NUMBER SEQUENCE ANALYSIS');
console.log('═'.repeat(80));

const checkNums = checks.filter(c => c.checkNum).map(c => parseInt(c.checkNum)).sort((a, b) => a - b);
const minCheck = Math.min(...checkNums);
const maxCheck = Math.max(...checkNums);
const expectedCount = maxCheck - minCheck + 1;
const missingNums = [];

for (let i = minCheck; i <= maxCheck; i++) {
  if (!checkNums.includes(i)) missingNums.push(i);
}

console.log(`\n   Check numbers range: #${minCheck} to #${maxCheck}`);
console.log(`   Checks found: ${checkNums.length} of ${expectedCount} expected (${((checkNums.length/expectedCount)*100).toFixed(0)}%)`);
console.log(`   Missing check numbers (${missingNums.length}): ${missingNums.slice(0, 30).join(', ')}${missingNums.length > 30 ? '...' : ''}`);

// ============================================================================
// 6. EXPORT DATA
// ============================================================================

const report = {
  statementSummary: totals,
  azureExtracted: {
    deposits: { count: deposits.length, total: depositTotal },
    atmDebit: { count: cardTx.length, total: cardTotal },
    checks: { count: checks.length, total: checkTotal },
    otherWithdrawals: { count: otherWithdrawals.length, total: otherTotal },
  },
  differences: {
    deposits: depositDiff,
    atmDebit: cardDiff,
    checks: checkDiff,
    other: otherDiff,
    net: netDiff,
  },
  missingCheckNumbers: missingNums,
  checksFound: checks,
  transactionsFound: transactions.length,
};

fs.writeFileSync('final-reconciliation-report.json', JSON.stringify(report, null, 2));
console.log('\n\nDetailed report saved to: final-reconciliation-report.json');
