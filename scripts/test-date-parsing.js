// Test if the date parsing logic works with Table 90 data

// Simulate the row from Table 90
const row = {
  col0: "04/01",        // Transaction Date
  col1: "",             // Post Date
  col2: "Deposit Dividend Split Rate",  // Description
  col3: "75.99",        // Amount
  col4: "95,075.99"     // New Balance
};

const values = Object.values(row);

console.log('Testing date/amount parsing with Table 90 data:\n');
console.log('Row values:', values);
console.log('');

// Test date regex - full date with year
const fullDateRegex = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/;
console.log('Full date regex (MM/DD/YYYY):');
values.forEach((v, i) => {
  console.log(`  col${i}: "${v}" -> ${fullDateRegex.test(v)}`);
});
console.log('');

// Test partial date regex - MM/DD without year
const partialDateRegex = /^\d{1,2}[\/\-]\d{1,2}$/;
console.log('Partial date regex (MM/DD):');
values.forEach((v, i) => {
  console.log(`  col${i}: "${v}" -> ${partialDateRegex.test(String(v).trim())}`);
});
console.log('');

// Test amount regex
const amountRegex = /^-?\$?[\d,]+\.\d{2}$/;
console.log('Amount regex:');
values.forEach((v, i) => {
  const cleaned = String(v).replace(/\s/g, '');
  console.log(`  col${i}: "${v}" -> ${amountRegex.test(cleaned)} (cleaned: "${cleaned}")`);
});
console.log('');

// Simulate the parsing logic
let date;
let partialDate;
let description = '';
let amount;

for (const value of values) {
  // Check for full date with year
  if (!date && !partialDate && fullDateRegex.test(value)) {
    date = value;
    console.log(`✅ Found full date: ${value}`);
  }
  // Check for partial date without year
  else if (!date && !partialDate && partialDateRegex.test(String(value).trim())) {
    partialDate = String(value).trim();
    console.log(`✅ Found partial date: ${partialDate}`);
  }
  // Check for amount
  else if (!amount && amountRegex.test(String(value).replace(/\s/g, ''))) {
    amount = parseFloat(String(value).replace(/[$,]/g, ''));
    console.log(`✅ Found amount: $${amount}`);
  }
  // Description (BUT: Don't add values that look like amounts)
  else if (String(value).length > 3 && !/^\d+$/.test(value) && !amountRegex.test(String(value).replace(/\s/g, ''))) {
    description = description ? `${description} ${value}` : value;
    console.log(`✅ Found description part: "${value}"`);
  } else if (amountRegex.test(String(value).replace(/\s/g, ''))) {
    console.log(`⏭️  Skipping amount-like value in description: "${value}"`);
  }
}

console.log('\n--- PARSING RESULTS ---');
console.log('Date:', date || 'NOT FOUND');
console.log('Partial Date:', partialDate || 'NOT FOUND');
console.log('Description:', description || 'NOT FOUND');
console.log('Amount:', amount ? `$${amount}` : 'NOT FOUND');

if (partialDate && !date) {
  const [month, day] = partialDate.split(/[\/\-]/).map(n => parseInt(n));
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  let inferredYear = 2024;
  if (currentYear >= 2025 && month >= 4) {
    inferredYear = 2025;
  } else if (currentYear === 2025 && month <= currentMonth) {
    inferredYear = 2025;
  }

  date = `${month}/${day}/${inferredYear}`;
  console.log(`\n✅ Inferred complete date: ${date}`);
}

console.log('\n--- FINAL CHECK ---');
if (date && amount && description) {
  console.log('✅ SUCCESS: All required fields found!');
  console.log(`   Date: ${date}`);
  console.log(`   Description: ${description}`);
  console.log(`   Amount: $${amount}`);
} else {
  console.log('❌ FAILED: Missing required fields');
  if (!date) console.log('   Missing: date');
  if (!description) console.log('   Missing: description');
  if (!amount) console.log('   Missing: amount');
}
