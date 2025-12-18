// Compare found vs expected dividends by amount
const found = require('../logix-from-azure.json');
const expected = require('../logix-dividends-from-statements.json');

console.log('\n📊 COMPARISON BY AMOUNT\n');
console.log('='.repeat(80));

// Create amount map for found dividends
const foundAmounts = new Map();
found.forEach(d => {
  const amt = d.amount.toFixed(2);
  if (!foundAmounts.has(amt)) foundAmounts.set(amt, []);
  foundAmounts.get(amt).push(d);
});

// Check which expected dividends are missing
const missing = [];
expected.forEach(e => {
  const amt = e.amount.toFixed(2);
  const matches = foundAmounts.get(amt) || [];
  if (matches.length === 0) {
    missing.push(e);
  }
});

console.log(`\nFound: ${found.length} dividends, $${found.reduce((s,d) => s + d.amount, 0).toFixed(2)}`);
console.log(`Expected: ${expected.length} dividends, $${expected.reduce((s,d) => s + d.amount, 0).toFixed(2)}`);
console.log(`Missing: ${missing.length} dividends, $${missing.reduce((s,d) => s + d.amount, 0).toFixed(2)}`);

console.log('\n\n❌ MISSING DIVIDENDS:\n');
missing.forEach((div, idx) => {
  console.log(`${String(idx + 1).padStart(2)}. ${div.dateDisplay}  $${div.amount.toFixed(2).padStart(10)}  ${div.description}`);
});
