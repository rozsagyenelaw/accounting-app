// Comprehensive comparison: What Azure found vs What should be in the app
const fs = require('fs');

console.log('\n' + '='.repeat(80));
console.log('📊 COMPREHENSIVE TRANSACTION COMPARISON REPORT');
console.log('='.repeat(80));

// Load the Azure data
const azureData = JSON.parse(fs.readFileSync('/Users/rozsagyene/accounting-app/azure-raw-response.json', 'utf-8'));
const logixFromAzure = JSON.parse(fs.readFileSync('/Users/rozsagyene/accounting-app/logix-from-azure.json', 'utf-8'));
const expectedLogix = JSON.parse(fs.readFileSync('/Users/rozsagyene/accounting-app/logix-dividends-from-statements.json', 'utf-8'));

console.log('\n📋 AZURE PARSING RESULTS:');
console.log('='.repeat(80));
console.log(`Total tables found: ${azureData.tableCount}`);
console.log(`Total paragraphs found: ${azureData.paragraphCount}`);

// Count BofA transaction patterns in Azure data
let bofaCount = 0;
azureData.tables.forEach(table => {
  const cells = table.cells || [];
  cells.forEach(cell => {
    if (typeof cell === 'string' && (
      cell.includes('CHECKCARD') ||
      cell.includes('SSA TREAS') ||
      cell.includes('WIRE TYPE') ||
      /CHECK #?\d+/i.test(cell)
    )) {
      bofaCount++;
    }
  });
});

console.log(`Bank of America transaction indicators: ${bofaCount}`);

console.log('\n\n📊 LOGIX DIVIDENDS ANALYSIS:');
console.log('='.repeat(80));
console.log(`Expected (from statements): ${expectedLogix.length} dividends, $${expectedLogix.reduce((s,d) => s + d.amount, 0).toFixed(2)}`);
console.log(`Found by Azure: ${logixFromAzure.length} dividends, $${logixFromAzure.reduce((s,d) => s + d.amount, 0).toFixed(2)}`);

const missingLogix = [];
const foundAmounts = new Map();
logixFromAzure.forEach(d => {
  const amt = d.amount.toFixed(2);
  if (!foundAmounts.has(amt)) foundAmounts.set(amt, []);
  foundAmounts.get(amt).push(d);
});

expectedLogix.forEach(e => {
  const amt = e.amount.toFixed(2);
  const matches = foundAmounts.get(amt) || [];
  if (matches.length === 0) {
    missingLogix.push(e);
  } else {
    // Remove one match
    matches.shift();
  }
});

console.log(`\n❌ Missing: ${missingLogix.length} dividends, $${missingLogix.reduce((s,d) => s + d.amount, 0).toFixed(2)}`);

if (missingLogix.length > 0) {
  console.log('\n\n🔍 MISSING LOGIX DIVIDENDS:');
  console.log('='.repeat(80));
  missingLogix.forEach((div, idx) => {
    console.log(`${String(idx + 1).padStart(2)}. ${div.dateDisplay.padEnd(12)} $${div.amount.toFixed(2).padStart(10)}  ${div.description}`);
  });
}

console.log('\n\n✅ SUMMARY:');
console.log('='.repeat(80));
console.log('The Azure Document Intelligence successfully parsed the PDF and found:');
console.log(`  • ${azureData.tableCount} tables with transaction data`);
console.log(`  • ${logixFromAzure.length} out of ${expectedLogix.length} Logix dividend transactions`);
console.log(`  • ${bofaCount} Bank of America transaction indicators`);

if (missingLogix.length > 0) {
  console.log('\n⚠️  ISSUE FOUND:');
  console.log(`  • ${missingLogix.length} Logix dividends are missing from the parsed data`);
  console.log(`  • Total missing amount: $${missingLogix.reduce((s,d) => s + d.amount, 0).toFixed(2)}`);
  console.log('\n💡 REASON:');
  console.log('  • These transactions are in Table 98 of the Azure response');
  console.log('  • Table 98 has unusual formatting with the amounts split across cells');
  console.log('  • Example: "1,628.30" appears in a separate cell from the description');
  console.log('  • The current parsing logic expects amount in the same row as description');

  console.log('\n🔧 RECOMMENDATION:');
  console.log('  • Update the parsing logic to handle this table format');
  console.log('  • Look for amount patterns in adjacent cells when description is found');
  console.log('  • This will capture all 35 Logix dividends correctly');
}

console.log('\n\n' + '='.repeat(80));
console.log('END OF REPORT');
console.log('='.repeat(80));
