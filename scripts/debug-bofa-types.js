// Debug: Check if BofA transactions have debit/credit indicators in Azure data
const fs = require('fs');

console.log('🔍 DEBUGGING BANK OF AMERICA TRANSACTION TYPES\n');

const azureData = JSON.parse(fs.readFileSync('/Users/rozsagyene/accounting-app/azure-raw-response.json', 'utf-8'));

// Look at first few BofA tables to see structure
let foundBofaTable = false;
let tableCount = 0;

for (let i = 0; i < azureData.tables.length && tableCount < 5; i++) {
  const table = azureData.tables[i];
  const cells = table.cells || [];

  // Check if this is a BofA table
  const hasBofaData = cells.some(cell =>
    typeof cell === 'string' && (
      cell.includes('CHECKCARD') ||
      cell.includes('Withdrawals and other subtractions') ||
      cell.includes('Deposits and other additions')
    )
  );

  if (!hasBofaData) continue;

  tableCount++;
  console.log(`\n${'='.repeat(100)}`);
  console.log(`TABLE ${i + 1}: ${table.rows} rows x ${table.cols} columns`);
  console.log('='.repeat(100));

  // Show all cells to understand structure
  console.log('\nALL CELLS:');
  cells.forEach((cell, idx) => {
    if (cell && String(cell).trim().length > 0) {
      console.log(`  [${idx}] ${String(cell).substring(0, 80)}`);
    }
  });

  // Parse into rows
  const rows = [];
  for (let j = 0; j < cells.length; j += table.cols) {
    rows.push(cells.slice(j, j + table.cols));
  }

  console.log('\n\nROWS:');
  rows.forEach((row, idx) => {
    const nonEmptyCells = row.filter(c => c && String(c).trim().length > 0);
    if (nonEmptyCells.length > 0) {
      console.log(`\nRow ${idx}:`);
      row.forEach((cell, cellIdx) => {
        if (cell && String(cell).trim().length > 0) {
          console.log(`  Col ${cellIdx}: ${String(cell).substring(0, 70)}`);
        }
      });
    }
  });
}

console.log('\n\n' + '='.repeat(100));
console.log('🔍 ANALYSIS:');
console.log('='.repeat(100));
console.log('\nLook for patterns:');
console.log('  • Are there separate columns for deposits vs withdrawals?');
console.log('  • Are there section headers like "Deposits and other additions"?');
console.log('  • Are there negative amounts or amounts in parentheses ()?');
console.log('  • How can we distinguish a receipt from a payment?');
