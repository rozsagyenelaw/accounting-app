// Simple analysis: Can we verify the Bank of America transaction count?
const XLSX = require('xlsx');

console.log('\n📊 BANK OF AMERICA COMPLETENESS CHECK\n');
console.log('='.repeat(80));

// Read the Excel file
const workbook = XLSX.readFile('/Users/rozsagyene/Downloads/drexler bank statemetns 2023-2025.xlsx');
const sheet = workbook.Sheets['Table 1'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log(`Total rows in Excel: ${data.length}`);

// The Excel is converted from PDF and is very messy
// But we can count transactions by looking for date patterns
let transactionRows = 0;
let depositRows = 0;
let withdrawalRows = 0;

for (let i = 0; i < data.length; i++) {
  const rowText = data[i].join(' ');

  // Look for common BofA transaction patterns
  if (rowText.match(/CHECKCARD|SSA TREAS|WIRE TYPE|CHECK #\d+/i)) {
    transactionRows++;
  }

  if (rowText.match(/Deposits and other additions/i)) {
    depositRows++;
  }

  if (rowText.match(/Withdrawals and other subtractions|ATM and debit card subtractions/i)) {
    withdrawalRows++;
  }
}

console.log(`\nTransaction indicator rows found: ${transactionRows}`);
console.log(`Deposit section headers: ${depositRows}`);
console.log(`Withdrawal section headers: ${withdrawalRows}`);

console.log('\n' + '='.repeat(80));
console.log('📋 WHAT WE KNOW FROM YOUR APP:');
console.log('='.repeat(80));
console.log('Your app shows it parsed 1137 transactions total');
console.log('This includes both Bank of America AND Logix transactions');

console.log('\n' + '='.repeat(80));
console.log('⚠️  EXCEL FILE LIMITATION:');
console.log('='.repeat(80));
console.log('The Excel file you provided is a direct PDF-to-Excel conversion.');
console.log('The formatting is heavily corrupted with misaligned columns and split cells.');
console.log('It cannot be reliably parsed to extract individual transactions.');

console.log('\n' + '='.repeat(80));
console.log('✅ RECOMMENDED APPROACH:');
console.log('='.repeat(80));
console.log('1. Your app already parsed the PDF using Azure Document Intelligence');
console.log('2. The parsed data shows 1137 transactions total');
console.log('3. To verify completeness, check in the app:');
console.log('   - Filter/search for "Bank of America" or "CHECKCARD"');
console.log('   - Count how many BofA transactions appear');
console.log('   - Compare the total dollar amounts to your bank statement summary');
console.log('4. Bank statements usually show summary totals at the top of each period');
console.log('   - Example: "Total Deposits: $XX,XXX.XX"');
console.log('   - Example: "Total Withdrawals: $XX,XXX.XX"');
console.log('   - Compare these totals to what your app shows');
