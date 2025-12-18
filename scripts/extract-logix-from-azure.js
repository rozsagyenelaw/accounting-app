// Extract Logix dividends directly from Azure response
const fs = require('fs');

console.log('🔍 EXTRACTING LOGIX DIVIDENDS FROM AZURE DATA\n');

const azureData = JSON.parse(fs.readFileSync('/Users/rozsagyene/accounting-app/azure-raw-response.json', 'utf-8'));

console.log(`Total tables: ${azureData.tableCount}`);
console.log(`Total paragraphs: ${azureData.paragraphCount}\n`);

// Find all tables with dividend data
const dividendTables = [];

for (let i = 0; i < azureData.tables.length; i++) {
  const table = azureData.tables[i];
  const cells = table.cells || [];
  const hasDividend = cells.some(cell =>
    typeof cell === 'string' && cell.toLowerCase().includes('dividend')
  );

  if (hasDividend) {
    dividendTables.push({ index: i, ...table });
  }
}

console.log(`Found ${dividendTables.length} tables with dividend data:\n`);

// Extract transactions from each dividend table
const allDividends = [];

dividendTables.forEach((table, idx) => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TABLE ${table.index + 1} (${table.rows} rows x ${table.cols} cols)`);
  console.log('='.repeat(80));

  // Parse the cells array into rows
  const cellData = table.cells || [];
  const rows = [];
  for (let i = 0; i < cellData.length; i += table.cols) {
    rows.push(cellData.slice(i, i + table.cols));
  }

  console.log('\nHeader row:', rows[0]);

  // Process each data row
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    console.log(`\nRow ${i}:`, row);

    // Try to extract date, description, amount
    let date = null;
    let description = '';
    let amount = null;

    for (const cell of row) {
      const cellStr = String(cell || '').trim();

      // Check for date (MM/DD format)
      if (!date && /^\d{1,2}\/\d{1,2}$/.test(cellStr)) {
        date = cellStr;
        continue;
      }

      // Description - must contain "dividend"
      if (!description && cellStr.length > 5 && cellStr.toLowerCase().includes('dividend')) {
        description = cellStr;
        continue;
      }

      // Check for amount (various formats)
      if (!amount) {
        // Format 1: Simple amount like "379.58" or "75.99"
        if (/^\d{1,3}(,\d{3})*\.\d{2}$/.test(cellStr)) {
          const parsed = parseFloat(cellStr.replace(/,/g, ''));
          if (parsed < 100000) {
            amount = parsed;
            continue;
          }
        }
        // Format 2: Amount with percentage like "5.010% 379.58"
        else if (/\d+\.\d{3}%\s+(\d{1,3}(,\d{3})*\.\d{2})/.test(cellStr)) {
          const match = cellStr.match(/\d+\.\d{3}%\s+(\d{1,3}(,\d{3})*\.\d{2})/);
          if (match) {
            const parsed = parseFloat(match[1].replace(/,/g, ''));
            if (parsed < 100000) {
              amount = parsed;
              continue;
            }
          }
        }
      }
    }

    if (date && description && amount) {
      console.log(`  ✅ FOUND: ${date} | ${description} | $${amount}`);

      // Infer year
      const [month, day] = date.split('/').map(n => parseInt(n));
      const year = month >= 4 ? 2024 : (month <= 8 ? 2025 : 2024);
      const fullDate = `${month}/${day}/${year}`;

      allDividends.push({
        date: fullDate,
        description: `Logix ${description}`,
        amount,
        type: 'RECEIPT',
        source: `Table ${table.index + 1}`
      });
    }
  }
});

console.log('\n\n' + '='.repeat(80));
console.log('📊 SUMMARY');
console.log('='.repeat(80));
console.log(`Total Logix dividends found: ${allDividends.length}`);
console.log(`Total amount: $${allDividends.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}`);

console.log('\n\n📋 ALL LOGIX DIVIDENDS:\n');
allDividends.forEach((div, idx) => {
  console.log(`${String(idx + 1).padStart(3)}. ${div.date.padEnd(12)} $${String(div.amount.toFixed(2)).padStart(10)} ${div.description}`);
});

// Save to file
fs.writeFileSync(
  '/Users/rozsagyene/accounting-app/logix-from-azure.json',
  JSON.stringify(allDividends, null, 2)
);

console.log('\n✅ Saved to: logix-from-azure.json');

console.log('\n\n' + '='.repeat(80));
console.log('🔍 COMPARISON WITH EXPECTED');
console.log('='.repeat(80));

const expected = JSON.parse(fs.readFileSync('/Users/rozsagyene/accounting-app/logix-dividends-from-statements.json', 'utf-8'));
console.log(`Expected: ${expected.length} dividends, $${expected.reduce((s, d) => s + d.amount, 0).toFixed(2)}`);
console.log(`Found: ${allDividends.length} dividends, $${allDividends.reduce((s, d) => s + d.amount, 0).toFixed(2)}`);
console.log(`Difference: ${expected.length - allDividends.length} dividends missing`);
