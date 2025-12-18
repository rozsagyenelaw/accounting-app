// Compare Bank of America transactions in Excel to what was parsed
const XLSX = require('xlsx');
const fs = require('fs');

console.log('📊 COMPARING BANK STATEMENTS TO PARSED TRANSACTIONS\n');
console.log('='.repeat(80));

// Read Excel file
const workbook = XLSX.readFile('/Users/rozsagyene/Downloads/drexler bank statemetns 2023-2025.xlsx');
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

console.log(`Total rows in Excel: ${data.length}\n`);
console.log('Extracting Bank of America transactions...\n');

let transactionCount = 0;
const bofaTransactions = [];

for (let i = 0; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length === 0) continue;

  const firstCol = String(row[0] || '').trim();

  // Look for date patterns in first column (MM/DD/YY format)
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(firstCol)) {
    const date = firstCol;
    let description = '';
    let amount = '';

    // Description and amount are in subsequent columns
    for (let j = 1; j < row.length; j++) {
      const cell = String(row[j] || '').trim();
      if (cell) {
        // Check if it's an amount (dollar format)
        const amountRegex = /^-?\$?[\d,]+\.\d{2}$/;
        if (amountRegex.test(cell)) {
          amount = cell;
        } else if (!description && cell.length > 3) {
          description = cell;
        }
      }
    }

    if (date && description && amount) {
      transactionCount++;
      bofaTransactions.push({ date, description, amount });

      if (transactionCount <= 50) {
        console.log(`${String(transactionCount).padStart(3)}. ${date} | ${amount.padStart(12)} | ${description.substring(0, 60)}`);
      }
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log('📊 BANK OF AMERICA SUMMARY');
console.log('='.repeat(80));
console.log(`Total BofA transactions in Excel: ${transactionCount}`);

// Calculate total deposits and withdrawals
let totalDeposits = 0;
let totalWithdrawals = 0;

bofaTransactions.forEach(txn => {
  const amt = parseFloat(txn.amount.replace(/[$,]/g, ''));
  if (amt > 0) {
    totalDeposits += amt;
  } else {
    totalWithdrawals += Math.abs(amt);
  }
});

console.log(`Total deposits: $${totalDeposits.toFixed(2)}`);
console.log(`Total withdrawals: $${totalWithdrawals.toFixed(2)}`);

// Save to file for comparison
fs.writeFileSync(
  '/Users/rozsagyene/accounting-app/bofa-from-excel.json',
  JSON.stringify(bofaTransactions, null, 2)
);

console.log('\n✅ Saved Bank of America transactions to: bofa-from-excel.json');

console.log('\n' + '='.repeat(80));
console.log('🔍 WHAT TO CHECK IN YOUR APP:');
console.log('='.repeat(80));
console.log('1. Search for "Bank of America" or "CHECKCARD" in transaction list');
console.log('2. Count how many BofA transactions appear');
console.log(`3. Expected: ${transactionCount} transactions`);
console.log('4. Compare totals to ensure all transactions captured');
