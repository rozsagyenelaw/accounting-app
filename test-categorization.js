// Quick test to verify categorization is working correctly
// Run with: node test-categorization.js

const testTransactions = [
  {
    description: "WIRE TYPE:WIRE IN FLETCHER JONES FOUNDATION",
    type: "RECEIPT",
    amount: 26979.17,
    expected: "A3_PENSIONS_ANNUITIES"
  },
  {
    description: "FLETCHER JONES WIRE",
    type: "RECEIPT",
    amount: 26979.17,
    expected: "A3_PENSIONS_ANNUITIES"
  },
  {
    description: "INTEREST EARNED",
    type: "RECEIPT",
    amount: 125.50,
    expected: "A2_INTEREST"
  },
  {
    description: "SSA TREAS 310",
    type: "RECEIPT",
    amount: 3200.00,
    expected: "A5_SOCIAL_SECURITY_VA"
  },
  {
    description: "TRANSFER TO SHARE",
    type: "RECEIPT",
    amount: 500000.00,
    expected: "SHOULD_BE_EXCLUDED"
  },
  {
    description: "CVS PHARMACY",
    type: "DISBURSEMENT",
    amount: 45.99,
    expected: "C6_MEDICAL"
  },
  {
    description: "SPROUTS FARMERS MARKET",
    type: "DISBURSEMENT",
    amount: 127.83,
    expected: "C7_LIVING_EXPENSES"
  }
];

// Import the categorization function
import { categorizeTransaction } from './lib/gc400-categories.ts';

console.log('\n=== CATEGORIZATION TEST ===\n');

let passed = 0;
let failed = 0;

for (const test of testTransactions) {
  if (test.expected === "SHOULD_BE_EXCLUDED") {
    console.log(`⚠️  SKIP: "${test.description}" - Internal transfer (should be excluded)`);
    continue;
  }

  const result = categorizeTransaction(test.description, test.type);
  const match = result.code === test.expected;

  if (match) {
    console.log(`✅ PASS: "${test.description}"`);
    console.log(`   → ${result.code} (${result.name})`);
    passed++;
  } else {
    console.log(`❌ FAIL: "${test.description}"`);
    console.log(`   Expected: ${test.expected}`);
    console.log(`   Got: ${result.code} (${result.name})`);
    console.log(`   Confidence: ${result.confidence}%`);
    console.log(`   Matched keywords: ${result.matchedKeywords.join(', ')}`);
    failed++;
  }
  console.log('');
}

console.log('\n=== RESULTS ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('');

if (failed > 0) {
  process.exit(1);
}
