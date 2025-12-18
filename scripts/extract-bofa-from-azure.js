// Extract Bank of America transactions directly from Azure response
const fs = require('fs');

console.log('🔍 EXTRACTING BANK OF AMERICA TRANSACTIONS FROM AZURE DATA\n');

const azureData = JSON.parse(fs.readFileSync('/Users/rozsagyene/accounting-app/azure-raw-response.json', 'utf-8'));

console.log(`Total tables: ${azureData.tableCount}`);
console.log(`Total paragraphs: ${azureData.paragraphCount}\n`);

const bofaTransactions = [];
let tableNum = 0;

// Look through all tables for BofA transactions
for (const table of azureData.tables) {
  tableNum++;
  const cells = table.cells || [];

  // Check if this table has BofA transaction patterns
  const hasBofaData = cells.some(cell =>
    typeof cell === 'string' && (
      cell.includes('CHECKCARD') ||
      cell.includes('SSA TREAS') ||
      cell.includes('WIRE TYPE') ||
      cell.includes('CHECK #') ||
      cell.includes('Bank of America')
    )
  );

  if (!hasBofaData) continue;

  // Parse table into rows
  const rows = [];
  for (let i = 0; i < cells.length; i += table.cols) {
    rows.push(cells.slice(i, i + table.cols));
  }

  // Process each row looking for transactions
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let date = null;
    let description = null;
    let amount = null;
    let type = null;

    for (const cell of row) {
      const cellStr = String(cell || '').trim();

      // Date pattern: MM/DD/YY or MM/DD/YYYY
      if (!date && /^\d{2}\/\d{2}\/\d{2,4}$/.test(cellStr)) {
        date = cellStr;
        continue;
      }

      // BofA description patterns
      if (!description && cellStr.length > 5) {
        if (cellStr.includes('CHECKCARD') ||
            cellStr.includes('SSA TREAS') ||
            cellStr.includes('WIRE TYPE') ||
            /CHECK #?\d+/i.test(cellStr)) {
          description = cellStr;
          continue;
        }
      }

      // Amount - look for negative (withdrawal) or positive (deposit)
      if (!amount && /^-?\$?\d{1,3}(,\d{3})*\.\d{2}$/.test(cellStr.replace(/[()]/g, ''))) {
        const cleaned = cellStr.replace(/[$,()-]/g, ''); // Remove all formatting including minus
        const isNegative = cellStr.includes('-') || cellStr.includes('(');
        const rawAmount = parseFloat(cleaned);

        // Determine type based on sign, but store amount as positive
        if (isNegative) {
          amount = Math.abs(rawAmount); // Always positive
          type = 'PAYMENT';
        } else {
          amount = Math.abs(rawAmount); // Always positive
          type = 'RECEIPT';
        }
      }
    }

    if (date && description && amount !== null) {
      // Convert date to full format
      const parts = date.split('/');
      let month = parseInt(parts[0]);
      let day = parseInt(parts[1]);
      let year = parseInt(parts[2]);

      // Handle 2-digit years
      if (year < 100) {
        year = year < 50 ? 2000 + year : 1900 + year;
      }

      bofaTransactions.push({
        date: `${month}/${day}/${year}`,
        description: `Bank of America ${description}`,
        amount,
        type,
        source: `Table ${tableNum}`,
        raw: { date, description, amount }
      });
    }
  }
}

console.log(`\n📊 EXTRACTION SUMMARY:`);
console.log('='.repeat(80));
console.log(`Total Bank of America transactions found: ${bofaTransactions.length}`);
console.log(`Total receipts: ${bofaTransactions.filter(t => t.type === 'RECEIPT').length}`);
console.log(`Total payments: ${bofaTransactions.filter(t => t.type === 'PAYMENT').length}`);

const totalReceipts = bofaTransactions.filter(t => t.type === 'RECEIPT').reduce((sum, t) => sum + t.amount, 0);
const totalPayments = bofaTransactions.filter(t => t.type === 'PAYMENT').reduce((sum, t) => sum + t.amount, 0);

console.log(`\nTotal receipt amount: $${totalReceipts.toFixed(2)}`);
console.log(`Total payment amount: $${totalPayments.toFixed(2)}`);

// Show sample transactions
console.log('\n\n📋 SAMPLE BANK OF AMERICA TRANSACTIONS (First 30):');
console.log('='.repeat(80));
bofaTransactions.slice(0, 30).forEach((t, idx) => {
  const typeSymbol = t.type === 'RECEIPT' ? '+' : '-';
  console.log(`${String(idx + 1).padStart(3)}. ${t.date.padEnd(12)} ${typeSymbol}$${String(t.amount.toFixed(2)).padStart(10)} ${t.description.substring(0, 60)}`);
});

if (bofaTransactions.length > 30) {
  console.log(`\n... and ${bofaTransactions.length - 30} more transactions`);
}

// Save to file
fs.writeFileSync(
  '/Users/rozsagyene/accounting-app/bofa-from-azure.json',
  JSON.stringify(bofaTransactions, null, 2)
);

console.log('\n✅ Saved all transactions to: bofa-from-azure.json');
