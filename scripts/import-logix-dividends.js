#!/usr/bin/env node
/**
 * Import Logix Dividends Script
 *
 * This script imports Logix FCU dividends from logix-dividends-from-statements.json
 * and merges them with existing transactions in the database.
 *
 * Usage:
 *   node scripts/import-logix-dividends.js
 *
 * Note: Since Azure Document Intelligence cannot parse Logix statements,
 * these dividends were manually extracted and stored in a JSON file.
 */

const fs = require('fs');
const path = require('path');

console.log('═'.repeat(60));
console.log('LOGIX DIVIDENDS IMPORT');
console.log('═'.repeat(60));

// Read the Logix dividends file
const logixPath = path.join(__dirname, '..', 'logix-dividends-from-statements.json');

if (!fs.existsSync(logixPath)) {
  console.error('\n❌ Error: logix-dividends-from-statements.json not found');
  console.log('   Please ensure the file exists at:', logixPath);
  process.exit(1);
}

const dividends = JSON.parse(fs.readFileSync(logixPath, 'utf8'));

console.log(`\n📋 Found ${dividends.length} Logix dividends:\n`);

// Display summary by month
const byMonth = {};
let total = 0;

for (const div of dividends) {
  const month = div.date.substring(0, 7); // YYYY-MM
  if (!byMonth[month]) {
    byMonth[month] = { count: 0, total: 0 };
  }
  byMonth[month].count++;
  byMonth[month].total += div.amount;
  total += div.amount;
}

console.log('   Month      | Count | Total');
console.log('   ' + '-'.repeat(35));
Object.keys(byMonth).sort().forEach(month => {
  const m = byMonth[month];
  console.log(`   ${month}   |   ${String(m.count).padStart(2)}  | $${m.total.toFixed(2).padStart(10)}`);
});

console.log('   ' + '-'.repeat(35));
console.log(`   TOTAL      |   ${String(dividends.length).padStart(2)}  | $${total.toFixed(2).padStart(10)}`);

// Convert to transaction format
const transactions = dividends.map((div, index) => ({
  id: `logix-dividend-${div.date}-${index}`,
  date: new Date(div.date).toISOString(),
  description: div.description,
  amount: div.amount,
  type: 'RECEIPT',
  category: 'A1', // Schedule A - Receipts
  subCategory: 'Interest/Dividends',
  confidence: 1.0,
  source: 'logix-import',
}));

// Output file
const outputPath = path.join(__dirname, '..', 'logix-transactions-to-import.json');
fs.writeFileSync(outputPath, JSON.stringify(transactions, null, 2));

console.log(`\n✅ Transactions prepared for import`);
console.log(`   Output file: ${outputPath}`);
console.log(`\n📝 To add these to your app:`);
console.log('   1. Open the app and go to Transactions');
console.log('   2. Use "Import from File" and select the JSON file');
console.log('   3. Or call the API: POST /api/import-logix');
console.log('\n   The API will return the transactions for merging.');
console.log('═'.repeat(60));
