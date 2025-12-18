// Parse Bank of America statement text file and extract transactions
const fs = require('fs');
const path = require('path');

const filePath = process.argv[2] || '/Users/rozsagyene/Downloads/drexler bank statemetns 2023-2025.txt';

console.log(`Reading file: ${filePath}\n`);
const content = fs.readFileSync(filePath, 'utf8');

// Track statement periods
const periodMatches = content.matchAll(/(?:for|to)\s+(\w+\s+\d{1,2},\s+\d{4})\s+to\s+(\w+\s+\d{1,2},\s+\d{4})/gi);
const periods = [];
for (const match of periodMatches) {
  periods.push({ from: match[1], to: match[2] });
}
console.log(`Found ${periods.length} statement periods`);
if (periods.length > 0) {
  console.log(`First period: ${periods[0].from} to ${periods[0].to}`);
  console.log(`Last period: ${periods[periods.length-1].from} to ${periods[periods.length-1].to}\n`);
}

const allTransactions = [];

// Known transaction patterns
const knownPatterns = [
  'CHECKCARD', 'CHECK CARD', 'PURCHASE', 'WIRE TYPE', 'SSA TREAS',
  'Interest Earned', 'Interest Paid', 'SOCALGAS', 'LA DWP', 'CHECK #',
  'GELSON', 'HOME DEPOT', 'TRADER JOE', 'SPROUTS', 'AMAZON', 'AMZN',
  'CVS', 'STARBUCKS', 'CHIPOTLE', 'TRUPANION', 'LA FITNESS',
  'BR FACTORY', 'ANNTAYLOR', 'RUSTY', 'UPS STORE', 'HEAVY HANDED'
];

// Regex for clean transaction lines
// Format: MM/DD/YY DESCRIPTION AMOUNT (with amount being last number)
const txLineRegex = /(\d{2}\/\d{2}\/\d{2})\s+(.+?)\s+(-?\d{1,3}(?:,\d{3})*\.\d{2})\s*(?=\d{2}\/\d{2}\/\d{2}|$|Total|continued|Page|I\s|,\s*\d{2}\/)/gi;

let txMatch;
while ((txMatch = txLineRegex.exec(content)) !== null) {
  const date = txMatch[1];
  let description = txMatch[2].trim();
  const amountStr = txMatch[3];
  const amount = parseFloat(amountStr.replace(/,/g, ''));

  // Parse the date to validate year
  const [month, day, year] = date.split('/').map(Number);
  const fullYear = 2000 + year;

  // Skip dates outside our range (2023-2025)
  if (fullYear < 2023 || fullYear > 2025) continue;

  // Skip very large amounts (likely balance lines)
  if (Math.abs(amount) > 100000) continue;

  // Filter out non-transaction matches
  if (description.length < 3) continue;
  if (description.includes('Page ')) continue;
  if (description.includes('Account#')) continue;
  if (description.includes('Transaction Post')) continue;
  if (description.includes('Transaction Description')) continue;
  if (/^\d+$/.test(description)) continue;

  // Clean up description - remove OCR artifacts
  description = description.replace(/\s+/g, ' ').trim();
  description = description.replace(/[~\\^`|]/g, '').trim();

  // Skip garbage descriptions (mostly non-printable chars)
  const printableRatio = (description.match(/[a-zA-Z0-9\s]/g) || []).length / description.length;
  if (printableRatio < 0.5 && description.length > 5) continue;

  // Skip if it's clearly not a transaction
  if (description.match(/^(to|from|for|or|and|the|of|in|on|at)\s/i)) continue;

  // Determine type based on amount sign and description
  let type = 'unknown';
  if (amount > 0) {
    type = 'deposit';
  } else {
    type = 'withdrawal';
  }

  // Try to identify transaction type from description
  const descUpper = description.toUpperCase();
  if (descUpper.includes('WIRE TYPE')) type = 'wire';
  else if (descUpper.includes('SSA TREAS') || descUpper.includes('SOC SEC')) type = 'social_security';
  else if (descUpper.includes('INTEREST')) type = 'interest';
  else if (descUpper.includes('CHECK #') || /CHECK\s*#?\d+/.test(descUpper) || /^\d{3}\s*[A-Z~]/.test(description)) type = 'check';
  else if (descUpper.includes('CHECKCARD') || descUpper.includes('CHECK CARD') || descUpper.includes('PURCHASE')) type = 'debit_card';

  allTransactions.push({
    date,
    description: description.substring(0, 100),
    amount,
    type
  });
}

// Deduplicate by date+amount (keep first occurrence with better description)
const seen = new Map();
const uniqueTransactions = [];
for (const t of allTransactions) {
  const key = `${t.date}|${t.amount.toFixed(2)}`;
  if (!seen.has(key)) {
    seen.set(key, t);
    uniqueTransactions.push(t);
  } else {
    // If current has a better (longer, more descriptive) description, replace
    const existing = seen.get(key);
    const hasKnownPattern = knownPatterns.some(p => t.description.toUpperCase().includes(p));
    const existingHasPattern = knownPatterns.some(p => existing.description.toUpperCase().includes(p));
    if (hasKnownPattern && !existingHasPattern) {
      const idx = uniqueTransactions.indexOf(existing);
      uniqueTransactions[idx] = t;
      seen.set(key, t);
    }
  }
}

// Sort by date
uniqueTransactions.sort((a, b) => {
  const [am, ad, ay] = a.date.split('/').map(Number);
  const [bm, bd, by] = b.date.split('/').map(Number);
  const aDate = new Date(2000 + ay, am - 1, ad);
  const bDate = new Date(2000 + by, bm - 1, bd);
  return aDate - bDate;
});

console.log(`\nExtracted ${uniqueTransactions.length} unique transactions\n`);

// Summary stats
const deposits = uniqueTransactions.filter(t => t.amount > 0);
const withdrawals = uniqueTransactions.filter(t => t.amount < 0);

console.log(`Deposits: ${deposits.length} totaling $${deposits.reduce((s, t) => s + t.amount, 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`);
console.log(`Withdrawals: ${withdrawals.length} totaling $${withdrawals.reduce((s, t) => s + t.amount, 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`);

// Show sample transactions
console.log(`\n--- First 30 Transactions ---\n`);
uniqueTransactions.slice(0, 30).forEach((t, i) => {
  console.log(`${String(i+1).padStart(3)}. ${t.date} | ${String(t.amount.toFixed(2)).padStart(12)} | ${t.description.substring(0, 60)}`);
});

console.log(`\n--- Last 30 Transactions ---\n`);
uniqueTransactions.slice(-30).forEach((t, i) => {
  console.log(`${String(uniqueTransactions.length - 30 + i + 1).padStart(3)}. ${t.date} | ${String(t.amount.toFixed(2)).padStart(12)} | ${t.description.substring(0, 60)}`);
});

// Save to JSON
const outputPath = path.join(__dirname, '..', 'bofa-from-statement.json');
fs.writeFileSync(outputPath, JSON.stringify(uniqueTransactions, null, 2));
console.log(`\nSaved to ${outputPath}`);
