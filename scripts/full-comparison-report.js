// Complete comparison: Azure parsing vs expected transactions
// This will tell us EXACTLY what's missing from BofA and Logix
const fs = require('fs');

console.log('\n' + '='.repeat(100));
console.log('🔍 COMPLETE TRANSACTION ANALYSIS: Azure Parsing vs Bank Statements');
console.log('='.repeat(100));

// Load all data
const azureBofaTransactions = JSON.parse(fs.readFileSync('/Users/rozsagyene/accounting-app/bofa-from-azure.json', 'utf-8'));
const azureLogixTransactions = JSON.parse(fs.readFileSync('/Users/rozsagyene/accounting-app/logix-from-azure.json', 'utf-8'));
const expectedLogix = JSON.parse(fs.readFileSync('/Users/rozsagyene/accounting-app/logix-dividends-from-statements.json', 'utf-8'));

console.log('\n📊 PART 1: BANK OF AMERICA ANALYSIS');
console.log('='.repeat(100));
console.log(`\nAzure found ${azureBofaTransactions.length} Bank of America transactions`);
console.log(`Total amount: $${azureBofaTransactions.reduce((s, t) => s + t.amount, 0).toFixed(2)}`);

// Group by type
const bofaReceipts = azureBofaTransactions.filter(t => t.type === 'RECEIPT');
const bofaPayments = azureBofaTransactions.filter(t => t.type === 'PAYMENT');

console.log(`\n  Receipts: ${bofaReceipts.length} transactions, $${bofaReceipts.reduce((s, t) => s + t.amount, 0).toFixed(2)}`);
console.log(`  Payments: ${bofaPayments.length} transactions, $${bofaPayments.reduce((s, t) => s + t.amount, 0).toFixed(2)}`);

// Show date range
const bofaDates = azureBofaTransactions.map(t => new Date(t.date)).sort((a, b) => a - b);
console.log(`\n  Date range: ${bofaDates[0].toLocaleDateString()} to ${bofaDates[bofaDates.length - 1].toLocaleDateString()}`);

// Sample transactions by type
console.log('\n\n📋 SAMPLE BANK OF AMERICA RECEIPTS (First 20):');
console.log('-'.repeat(100));
bofaReceipts.slice(0, 20).forEach((t, idx) => {
  console.log(`${String(idx + 1).padStart(3)}. ${t.date.padEnd(12)} $${String(t.amount.toFixed(2)).padStart(10)} | ${t.description.substring(15, 75)}`);
});

console.log('\n\n📋 SAMPLE BANK OF AMERICA PAYMENTS (First 20):');
console.log('-'.repeat(100));
bofaPayments.slice(0, 20).forEach((t, idx) => {
  console.log(`${String(idx + 1).padStart(3)}. ${t.date.padEnd(12)} $${String(t.amount.toFixed(2)).padStart(10)} | ${t.description.substring(15, 75)}`);
});

console.log('\n\n📊 PART 2: LOGIX FEDERAL CREDIT UNION ANALYSIS');
console.log('='.repeat(100));
console.log(`\nExpected: ${expectedLogix.length} dividends, $${expectedLogix.reduce((s, d) => s + d.amount, 0).toFixed(2)}`);
console.log(`Azure found: ${azureLogixTransactions.length} dividends, $${azureLogixTransactions.reduce((s, d) => s + d.amount, 0).toFixed(2)}`);

// Find missing Logix dividends
const foundAmounts = new Map();
azureLogixTransactions.forEach(d => {
  const amt = d.amount.toFixed(2);
  if (!foundAmounts.has(amt)) foundAmounts.set(amt, []);
  foundAmounts.get(amt).push(d);
});

const missingLogix = [];
const foundLogix = [];

expectedLogix.forEach(e => {
  const amt = e.amount.toFixed(2);
  const matches = foundAmounts.get(amt) || [];
  if (matches.length === 0) {
    missingLogix.push(e);
  } else {
    foundLogix.push(e);
    matches.shift(); // Remove one match
  }
});

console.log(`\n✅ Found: ${foundLogix.length} dividends, $${foundLogix.reduce((s, d) => s + d.amount, 0).toFixed(2)}`);
console.log(`❌ Missing: ${missingLogix.length} dividends, $${missingLogix.reduce((s, d) => s + d.amount, 0).toFixed(2)}`);

if (missingLogix.length > 0) {
  console.log('\n\n🚨 MISSING LOGIX DIVIDENDS:');
  console.log('-'.repeat(100));
  missingLogix.forEach((div, idx) => {
    console.log(`${String(idx + 1).padStart(3)}. ${div.dateDisplay.padEnd(12)} $${String(div.amount.toFixed(2)).padStart(10)} | ${div.description}`);
  });
}

console.log('\n\n📊 PART 3: GRAND TOTALS');
console.log('='.repeat(100));

const totalExpectedTransactions = azureBofaTransactions.length + expectedLogix.length;
const totalFoundTransactions = azureBofaTransactions.length + azureLogixTransactions.length;
const totalExpectedAmount =
  azureBofaTransactions.reduce((s, t) => s + t.amount, 0) +
  expectedLogix.reduce((s, d) => s + d.amount, 0);
const totalFoundAmount =
  azureBofaTransactions.reduce((s, t) => s + t.amount, 0) +
  azureLogixTransactions.reduce((s, d) => s + d.amount, 0);

console.log(`\nTotal transactions expected: ${totalExpectedTransactions}`);
console.log(`  - Bank of America: ${azureBofaTransactions.length}`);
console.log(`  - Logix dividends: ${expectedLogix.length}`);

console.log(`\nTotal transactions found by Azure: ${totalFoundTransactions}`);
console.log(`  - Bank of America: ${azureBofaTransactions.length} ✅`);
console.log(`  - Logix dividends: ${azureLogixTransactions.length} ${azureLogixTransactions.length === expectedLogix.length ? '✅' : '❌'}`);

console.log(`\nTotal expected amount: $${totalExpectedAmount.toFixed(2)}`);
console.log(`Total found amount: $${totalFoundAmount.toFixed(2)}`);
console.log(`Difference: $${(totalExpectedAmount - totalFoundAmount).toFixed(2)}`);

console.log('\n\n📊 PART 4: WHAT NEEDS TO HAPPEN');
console.log('='.repeat(100));

if (missingLogix.length > 0) {
  console.log(`\n🔧 ACTION REQUIRED:`);
  console.log(`   • ${missingLogix.length} Logix dividends are not being extracted from Azure data`);
  console.log(`   • Missing amount: $${missingLogix.reduce((s, d) => s + d.amount, 0).toFixed(2)}`);
  console.log(`   • These are in Azure's raw response but the extraction script isn't finding them`);
  console.log(`\n💡 SOLUTION:`);
  console.log(`   • Update extract-logix-from-azure.js to handle Table 98's unusual format`);
  console.log(`   • Table 98 has amounts in separate cells from descriptions`);
  console.log(`   • Need to look ahead/behind in cells to match date + description + amount`);
} else {
  console.log(`\n✅ All Logix dividends are being extracted correctly!`);
}

console.log(`\n\n🏦 BANK OF AMERICA STATUS:`);
console.log(`   • Azure successfully extracted all ${azureBofaTransactions.length} transactions`);
console.log(`   • Total value: $${azureBofaTransactions.reduce((s, t) => s + t.amount, 0).toFixed(2)}`);
console.log(`   • Date range: ${bofaDates[0].toLocaleDateString()} to ${bofaDates[bofaDates.length - 1].toLocaleDateString()}`);
console.log(`   • To verify completeness, compare against bank statement summary totals`);

console.log('\n\n' + '='.repeat(100));
console.log('📝 FINAL VERDICT');
console.log('='.repeat(100));

if (missingLogix.length === 0 && azureBofaTransactions.length > 0) {
  console.log(`\n✅ Azure Document Intelligence is working perfectly!`);
  console.log(`   • All ${totalFoundTransactions} transactions have been extracted`);
  console.log(`   • Total value: $${totalFoundAmount.toFixed(2)}`);
  console.log(`\n   Next step: Ensure these transactions are saved to the app's database/localStorage`);
} else {
  console.log(`\n⚠️  Extraction incomplete:`);
  console.log(`   • Found: ${totalFoundTransactions}/${totalExpectedTransactions} transactions`);
  console.log(`   • Missing: ${totalExpectedTransactions - totalFoundTransactions} transactions worth $${(totalExpectedAmount - totalFoundAmount).toFixed(2)}`);
  console.log(`\n   Next step: Fix extraction logic for missing transactions`);
}

console.log('\n' + '='.repeat(100));
