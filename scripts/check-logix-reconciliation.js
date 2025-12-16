const fs = require('fs');

// Read the Logix statement text files
const logixFullText = fs.readFileSync('/Users/rozsagyene/accounting-app/logix-statement-full.txt', 'utf-8');
const logixSummaryText = fs.readFileSync('/Users/rozsagyene/accounting-app/logix-statement-summary.txt', 'utf-8');

console.log('🔍 LOGIX DIVIDEND RECONCILIATION CHECK\n');
console.log('=' .repeat(80));

// Parse Logix dividends from the statements
const logixDividends = [];
const combinedText = logixFullText + '\n' + logixSummaryText;
const lines = combinedText.split('\n');

// The PDF extraction puts date, description, and amount on separate lines with blank lines between
// Pattern: date, blank, description, blank, amount, blank
for (let i = 0; i < lines.length - 5; i++) {
  const dateLine = lines[i].trim();
  const descLine = lines[i + 2].trim(); // Skip blank line
  const amountLine = lines[i + 4].trim(); // Skip another blank line

  // Check if this looks like a date
  const dateMatch = dateLine.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if (!dateMatch) continue;

  // Check if next line contains "Logix" and "dividend"
  if (!descLine.match(/Logix.*dividend/i)) continue;

  // Check if following line is an amount
  const amountMatch = amountLine.match(/^\$?([\d,]+\.\d{2})$/);
  if (!amountMatch) continue;

  // Parse the data
  const [, month, day, year] = dateMatch;
  let fullYear = parseInt(year);
  if (fullYear < 100) fullYear += 2000;
  const date = new Date(fullYear, parseInt(month) - 1, parseInt(day));

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));

  if (!isNaN(date) && !isNaN(amount) && amount > 0) {
    logixDividends.push({
      date: date.toISOString().split('T')[0],
      dateDisplay: `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${fullYear}`,
      amount: amount,
      description: descLine
    });
  }
}

// Remove duplicates (same date and amount)
const uniqueDividends = [];
const seen = new Set();
for (const dividend of logixDividends) {
  const key = `${dividend.date}-${dividend.amount}`;
  if (!seen.has(key)) {
    seen.add(key);
    uniqueDividends.push(dividend);
  }
}

// Sort by date
uniqueDividends.sort((a, b) => new Date(a.date) - new Date(b.date));

console.log(`\n📊 Found ${uniqueDividends.length} Logix dividend transactions in bank statements:\n`);

// Calculate total
const totalLogixDividends = uniqueDividends.reduce((sum, d) => sum + d.amount, 0);

// Display all dividends
uniqueDividends.forEach((dividend, idx) => {
  console.log(`${idx + 1}. ${dividend.dateDisplay}  $${dividend.amount.toFixed(2)}`);
});

console.log('\n' + '─'.repeat(80));
console.log(`TOTAL LOGIX DIVIDENDS: $${totalLogixDividends.toFixed(2)}`);
console.log('─'.repeat(80));

console.log('\n💡 Next Steps:');
console.log('1. Compare this list with the transactions shown in your app');
console.log('2. Search for "Logix" in the app\'s transaction list');
console.log('3. Check if all dividend amounts match');
console.log('4. Look for the date range: ' +
  (uniqueDividends.length > 0
    ? `${uniqueDividends[0].dateDisplay} to ${uniqueDividends[uniqueDividends.length - 1].dateDisplay}`
    : 'No dividends found'));

// Save to JSON for reference
const reportPath = '/Users/rozsagyene/accounting-app/logix-dividends-from-statements.json';
fs.writeFileSync(reportPath, JSON.stringify(uniqueDividends, null, 2));
console.log(`\n💾 Detailed list saved to: ${reportPath}`);

// Create a simple checklist
console.log('\n\n📋 RECONCILIATION CHECKLIST:');
console.log('─'.repeat(80));
console.log('In your app, search for "Logix" and verify these amounts appear:');
console.log('');
uniqueDividends.forEach((dividend, idx) => {
  console.log(`[ ] ${dividend.dateDisplay}  $${dividend.amount.toFixed(2).padStart(10)}`);
});
