/**
 * FIXED Bank Statement Parser - Court-Ready
 * Based on actual Bank of America OCR format analysis
 */

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'RECEIPT' | 'DISBURSEMENT';
  source: 'Bank of America' | 'Logix Credit Union';
  rawLine: string;
}

// EXACT pattern from requirements - matches actual BofA OCR format
const TRANSACTION_PATTERN = /^[,.\s•I'\"#$%&*\-~|[\]\\`]*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})\s+(.+?)\s+(-?[\d,]+\.\d{2})\s*$/;

// ALL skip patterns from requirements
const SKIP_PATTERNS = [
  /^(Date|Description|Amount)\s*$/i,
  /^Total/i,
  /^Page \d+/i,
  /^Account summary/i,
  /^Beginning balance/i,
  /^Ending balance/i,
  /^Annual Percentage/i,
  /^Service fees/i,
  /continued on the next/i,
  /^BANK OF AMERICA/i,
  /^P\.O\. Box/i,
  /^Customer service/i,
  /^Switch to.*paperless/i,
  /bankofamerica\.com/i,
  /^\$[\d,]+\.\d{2}$/,
  /^-\$?[\d,]+\.\d{2}$/,
  /Braille and Large Print/i,
  /^449444600/,  // Logix account number - CRITICAL
  /Statement Period/i,
  /ACCOUNT BALANCE SUMMARY/i,
  /^Savings$/i,
  /^Checking$/i,
  /^Money Market$/i,
  /^Certificates/i,
  /^IRAs$/i,
  /SAVINGS \(ID/i,
  /HIGH RATE SAVINGS/i,
  /FLEX CERTIFICATE/i,
  /JUMBO CERTIFICATE/i,
  /PROMO CERTIFICATE/i,
  /^Previous Balance/i,
  /^New Balance/i,
  /Dividends Earned in/i,
  /^Matures on:/i,
  /Annual Percentage Yield Earned/i,
  /Based on an Average Daily/i,
  /^Current Balance:/i,
  /Dividend and Interest Summary/i,
  /Federally Insured by NCUA/i,
  /log!.*federal credit/i,
  /www\.lfcu\.com/i,
  /ANNUAL PRIVACY NOTICE/i,
  /approximately 30 days of enrolling/i,
  /Promotion ends/i,
  /subject to change/i,
  /^\d+ of \d+$/,
  /^\s*$/,
];

// Receipt keywords from requirements
const RECEIPT_KEYWORDS = [
  /SSA TREAS/i,
  /FLETCHER JONES/i,
  /Interest Earned/i,
  /WIRE.*IN/i,
  /WIRE TYPE:WIRE IN/i,
  /DEPOSIT/i,
  /REFUND/i,
  /NST THE HOME/i,  // Home Depot refund
];

/**
 * Parse Bank of America transactions
 */
function parseBankOfAmericaTransactions(text: string): ParsedTransaction[] {
  console.log(`[BofA Parser] Processing ${text.length} characters`);

  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');

  let currentSection: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Track section headers (for context)
    if (/Deposits and other additions/i.test(trimmed)) {
      currentSection = 'deposits';
      continue;
    }
    if (/ATM and debit card subtractions/i.test(trimmed)) {
      currentSection = 'atm_debit';
      continue;
    }
    if (/Other subtractions/i.test(trimmed)) {
      currentSection = 'other_sub';
      continue;
    }
    if (/^Checks\s*$/i.test(trimmed)) {
      currentSection = 'checks';
      continue;
    }

    // Skip garbage lines - EXACT list from requirements
    const shouldSkip = SKIP_PATTERNS.some(pattern => pattern.test(trimmed));
    if (shouldSkip) continue;

    // Try to match transaction pattern - EXACT pattern from requirements
    const match = trimmed.match(TRANSACTION_PATTERN);
    if (!match) continue;

    const [, monthStr, dayStr, yearStr, description, amountStr] = match;

    // Clean description
    const cleanDesc = description.trim();

    // Garbage description validation - EXACT rules from requirements
    if (cleanDesc.length < 5) continue;
    if (/^[\d\s\-$.,]+$/.test(cleanDesc)) continue;
    if (/^(Check#|Checks|Amount|Date|continued|#)$/i.test(cleanDesc)) continue;
    if (/449444600/.test(cleanDesc)) continue;  // Logix account
    if (/thru/i.test(cleanDesc) && /\//.test(cleanDesc)) continue;  // Statement period
    if (/ATM and debit card subtractions/i.test(cleanDesc)) continue;
    if (/Other subtractions/i.test(cleanDesc)) continue;

    // Parse date
    let year = parseInt(yearStr, 10);
    if (year < 100) year += 2000;

    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    // Validate date
    if (month < 1 || month > 12) continue;
    if (day < 1 || day > 31) continue;
    if (year < 2023 || year > 2025) continue;

    // Parse amount
    const amount = Math.abs(parseFloat(amountStr.replace(/,/g, '')));

    // Amount limit - EXACT rule from requirements
    if (amount > 50000) continue;  // Skip certificate balances

    // Determine receipt vs disbursement
    let isReceipt = RECEIPT_KEYWORDS.some(pattern => pattern.test(cleanDesc));

    // Section context override
    if (currentSection === 'deposits') {
      isReceipt = true;
    } else if (currentSection && ['atm_debit', 'other_sub', 'checks'].includes(currentSection)) {
      if (!RECEIPT_KEYWORDS.some(p => p.test(cleanDesc))) {
        isReceipt = false;
      }
    }

    const type: 'RECEIPT' | 'DISBURSEMENT' = isReceipt ? 'RECEIPT' : 'DISBURSEMENT';

    // Create transaction
    const date = new Date(year, month - 1, day);

    transactions.push({
      date,
      description: cleanDesc,
      amount,
      type,
      source: 'Bank of America',
      rawLine: line
    });
  }

  console.log(`[BofA Parser] Parsed ${transactions.length} transactions`);

  return transactions;
}

/**
 * Parse Logix dividend income ONLY - NOT certificate balances
 */
function parseLogixDividends(text: string): ParsedTransaction[] {
  console.log(`[Logix Parser] Processing ${text.length} characters`);

  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');

  let currentYear = 2024;

  for (const line of lines) {
    // Update year from statement period
    const yearMatch = line.match(/thru\s+\d{2}\/\d{2}\/(\d{2})/);
    if (yearMatch) {
      currentYear = 2000 + parseInt(yearMatch[1], 10);
    }

    // Match dividend income lines ONLY
    const divMatch = line.match(/(\d{2})\/(\d{2})\s+Deposit Dividend.*?\s+([\d,]+\.\d{2})/);
    if (divMatch) {
      const [, monthStr, dayStr, amountStr] = divMatch;
      const amount = parseFloat(amountStr.replace(/,/g, ''));

      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && amount > 0) {
        const date = new Date(currentYear, month - 1, day);

        transactions.push({
          date,
          description: 'Logix Credit Union - Dividend Income',
          amount,
          type: 'RECEIPT',
          source: 'Logix Credit Union',
          rawLine: line
        });
      }
    }
  }

  console.log(`[Logix Parser] Parsed ${transactions.length} dividend transactions`);

  return transactions;
}

/**
 * Main parser - combines Bank of America and Logix
 */
export function parseBankStatements(text: string): ParsedTransaction[] {
  console.log(`[Fixed Parser] Processing ${text.length} characters`);

  // Parse both sources
  const bofaTransactions = parseBankOfAmericaTransactions(text);
  const logixTransactions = parseLogixDividends(text);

  // Combine
  const allTransactions = [...bofaTransactions, ...logixTransactions];

  // Sort by date
  allTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate totals
  const receipts = allTransactions.filter(t => t.type === 'RECEIPT');
  const disbursements = allTransactions.filter(t => t.type === 'DISBURSEMENT');

  const receiptTotal = receipts.reduce((sum, t) => sum + t.amount, 0);
  const disbursementTotal = disbursements.reduce((sum, t) => sum + t.amount, 0);

  console.log(`[Fixed Parser] RESULTS:`);
  console.log(`  Total: ${allTransactions.length} transactions`);
  console.log(`  BofA: ${bofaTransactions.length}, Logix: ${logixTransactions.length}`);
  console.log(`  Receipts: ${receipts.length} = $${receiptTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`  Disbursements: ${disbursements.length} = $${disbursementTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  return allTransactions;
}

/**
 * Validate for court filing
 */
export function validateResults(transactions: ParsedTransaction[]): string[] {
  const warnings: string[] = [];

  if (transactions.length < 500) {
    warnings.push(`CRITICAL: Only ${transactions.length} transactions. Expected 1,000+ for 2-year period`);
  }

  // Check for garbage that slipped through
  const garbageDescriptions = transactions.filter(t =>
    /449444600|Check#|ATM and debit card|thru.*\//i.test(t.description) ||
    t.description.length < 5
  );

  if (garbageDescriptions.length > 0) {
    warnings.push(`ERROR: ${garbageDescriptions.length} garbage descriptions found`);
    console.log('[Validation] Garbage samples:', garbageDescriptions.slice(0, 10));
  }

  // Check for certificate balances parsed as transactions
  const largeDisbursements = transactions.filter(t => t.type === 'DISBURSEMENT' && t.amount > 50000);
  if (largeDisbursements.length > 1) {
    warnings.push(`ERROR: ${largeDisbursements.length} disbursements over $50K (likely certificate balances)`);
    console.log('[Validation] Large disbursements:', largeDisbursements);
  }

  return warnings;
}
