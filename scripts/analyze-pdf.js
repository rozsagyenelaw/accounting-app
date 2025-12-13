const pdf = require('pdf-parse/lib/pdf-parse.js');
const fs = require('fs');

async function analyzePDF() {
  const dataBuffer = fs.readFileSync('/Users/rozsagyene/Downloads/1-bofa statements-Logix 23-24.pdf');
  const data = await pdf(dataBuffer);

  console.log('Total pages:', data.numpages);
  console.log('Total text length:', data.text.length);
  console.log('\n=== All lines (non-empty only) ===\n');

  const lines = data.text.split('\n').filter(line => line.trim().length > 0);
  console.log(`Total non-empty lines: ${lines.length}`);

  lines.slice(0, 300).forEach((line, i) => {
    console.log(`${i + 1}: ${line}`);
  });
}

analyzePDF().catch(console.error);
