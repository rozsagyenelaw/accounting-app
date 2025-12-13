/**
 * PRODUCTION BANK STATEMENT PARSER
 * For court filing - must be 100% accurate
 *
 * Handles:
 * - Bank of America checking account statements
 * - Logix Federal Credit Union dividend income
 *
 * Excludes:
 * - Certificate balances
 * - Account headers
 * - Section headers
 * - Promotional text
 */

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'RECEIPT' | 'DISBURSEMENT';
  source: 'Bank of America' | 'Logix Credit Union';
  rawLine: string;
}

/**
 * Main parser entry point
 */
export function parseBankStatements(text: string): ParsedTransaction[] {
  console.log(`[Production Parser] Processing ${text.length} characters`);

  // Split into Bank of America and Logix sections
  const { bankOfAmerica, logix } = splitDocumentSections(text);

  console.log(`[Production Parser] Found ${bankOfAmerica.length} BofA pages, ${logix.length} Logix pages`);

  const transactions: ParsedTransaction[] = [];

  // Parse Bank of America transactions
  const bofaTransactions = parseBankOfAmericaTransactions(bankOfAmerica);
  transactions.push(...bofaTransactions);

  // Parse Logix dividend income only
  const logixTransactions = parseLogixDividends(logix);
  transactions.push(...logixTransactions);

  // Sort by date
  transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Log summary
  const receipts = transactions.filter(t => t.type === 'RECEIPT');
  const disbursements = transactions.filter(t => t.type === 'DISBURSEMENT');
  const totalReceipts = receipts.reduce((sum, t) => sum + t.amount, 0);
  const totalDisbursements = disbursements.reduce((sum, t) => sum + t.amount, 0);

  console.log(`[Production Parser] FINAL RESULTS:`);
  console.log(`  Total Transactions: ${transactions.length}`);
  console.log(`  BofA: ${bofaTransactions.length}, Logix: ${logixTransactions.length}`);
  console.log(`  Receipts: ${receipts.length} = $${totalReceipts.toLocaleString()}`);
  console.log(`  Disbursements: ${disbursements.length} = $${totalDisbursements.toLocaleString()}`);

  return transactions;
}

/**
 * Split document into Bank of America and Logix sections
 */
function splitDocumentSections(text: string): { bankOfAmerica: string; logix: string } {
  const lines = text.split('\n');
  const bankOfAmericaLines: string[] = [];
  const logixLines: string[] = [];

  let currentSection: 'bofa' | 'logix' | 'unknown' = 'unknown';

  for (const line of lines) {
    // Detect Bank of America pages
    if (/BANK OF AMERICA|Account.*3251.*5554.*5179|P\.O\. Box 25118/i.test(line)) {
      currentSection = 'bofa';
    }
    // Detect Logix pages
    else if (/Logix Federal Credit Union|Account.*449444600|LFCU|P\.O\. Box 7600/i.test(line)) {
      currentSection = 'logix';
    }
    // Exclude certificate balances and Logix account info from BofA section
    else if (/JUMBO CERTIFICATE|PROMO CERTIFICATE|449444600|Matures on|Promotion ends/i.test(line)) {
      currentSection = 'logix'; // Redirect to logix to exclude from BofA
    }

    if (currentSection === 'bofa') {
      bankOfAmericaLines.push(line);
    } else if (currentSection === 'logix') {
      logixLines.push(line);
    }
  }

  return {
    bankOfAmerica: bankOfAmericaLines.join('\n'),
    logix: logixLines.join('\n')
  };
}

/**
 * Parse Bank of America transactions
 */
function parseBankOfAmericaTransactions(text: string): ParsedTransaction[] {
  console.log(`[BofA Parser] Processing ${text.length} characters`);

  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');

  // Comprehensive list of lines to SKIP
  const SKIP_PATTERNS = [
    // Section headers
    /^ATM and debit card subtractions/i,
    /^Other subtractions/i,
    /^Deposits and other additions/i,
    /^Withdrawals and other subtractions/i,
    /^Checks/i,

    // Column headers
    /^Date\s+Description/i,
    /^Date\s+Check/i,
    /^Description\s+Amount/i,

    // Totals and summaries
    /^Total/i,
    /^Subtotal/i,
    /^Beginning balance/i,
    /^Ending balance/i,
    /^Daily balance/i,
    /^Account summary/i,
    /^Service fees/i,
    /^Interest summary/i,
    /^Annual Percentage/i,
    /^Dividends Earned/i,

    // Page markers
    /^Page \d+/i,
    /continued on/i,
    /^Statement Period/i,

    // Bank info
    /BANK OF AMERICA/i,
    /P\.O\. Box/i,
    /Customer service/i,
    /www\.bankofamerica\.com/i,

    // Logix artifacts
    /449444600/,
    /Logix/i,
    /JUMBO CERTIFICATE/i,
    /PROMO CERTIFICATE/i,
    /Matures on/i,
    /Promotion ends/i,
    /Federal Credit Union/i,

    // Promotional/marketing text
    /approximately 30 days/i,
    /enrolling in/i,
    /terms and conditions/i,
    /For more information/i,
  ];

  // Transaction pattern: DATE at start, DESCRIPTION in middle, AMOUNT at end
  // Format: MM/DD/YY DESCRIPTION AMOUNT
  const transactionPattern = /^[,.\s•I\-]*(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})\s*$/;

  let parsedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    // Skip header/garbage lines
    if (SKIP_PATTERNS.some(pattern => pattern.test(line))) {
      continue;
    }

    // Try to match transaction pattern
    const match = line.match(transactionPattern);
    if (!match) continue;

    const [, monthStr, dayStr, yearStr, description, amountStr] = match;

    // Additional description validation
    const descTrimmed = description.trim();

    // Skip if description is garbage
    if (descTrimmed.length < 3) continue;
    if (/^(Check#?|Checks|Amount|Date|Balance)$/i.test(descTrimmed)) continue;
    if (/^\d+$/.test(descTrimmed)) continue; // Just a number
    if (/^-?\$?[\d,]+\.\d{2}$/.test(descTrimmed)) continue; // Just an amount
    if (/^[^a-zA-Z]+$/.test(descTrimmed)) continue; // No letters

    // Parse date
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    const year = 2000 + parseInt(yearStr, 10);

    // Validate date
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2020 || year > 2030) {
      continue;
    }

    // Parse amount
    const amount = Math.abs(parseFloat(amountStr.replace(/[$,]/g, '')));
    if (isNaN(amount) || amount === 0) continue;

    // Determine transaction type based on GENERIC keywords
    const isReceipt = /DEPOSIT|CREDIT|REFUND|INTEREST|DIVIDEND|WIRE.*IN|TRANSFER.*IN|PAYROLL|SALARY|PENSION|ANNUIT|SOCIAL\s+SECURITY|SSA|REIMBURSEMENT|ACH.*CREDIT/i.test(descTrimmed);

    const type: 'RECEIPT' | 'DISBURSEMENT' = isReceipt ? 'RECEIPT' : 'DISBURSEMENT';

    // Create transaction
    const date = new Date(year, month - 1, day);

    transactions.push({
      date,
      description: descTrimmed,
      amount,
      type,
      source: 'Bank of America',
      rawLine: line
    });

    parsedCount++;

    // Log first few for debugging
    if (parsedCount <= 5) {
      console.log(`[BofA Parser] ${parsedCount}. ${date.toISOString().split('T')[0]} | ${type} | $${amount.toFixed(2)} | ${descTrimmed.substring(0, 50)}`);
    }
  }

  console.log(`[BofA Parser] Parsed ${parsedCount} transactions`);

  return transactions;
}

/**
 * Parse Logix Credit Union dividend income ONLY
 * DO NOT parse certificate balances as transactions
 */
function parseLogixDividends(text: string): ParsedTransaction[] {
  console.log(`[Logix Parser] Processing ${text.length} characters`);

  const transactions: ParsedTransaction[] = [];

  // Only match actual dividend deposit transactions
  // Format: MM/DD    Deposit Dividend...    AMOUNT
  const dividendPattern = /(\d{2})\/(\d{2})\s+(?:Deposit\s+)?Dividend[^0-9]+?([\d,]+\.\d{2})/gi;

  // Extract statement year from "Statement Period: MM/DD/YY to MM/DD/YY"
  const yearMatch = text.match(/Statement Period.*?(\d{2})\/\d{2}\/(\d{2})/);
  const statementYear = yearMatch ? 2000 + parseInt(yearMatch[2], 10) : 2024;

  let match;
  while ((match = dividendPattern.exec(text)) !== null) {
    const [fullMatch, monthStr, dayStr, amountStr] = match;

    // Skip if this looks like a summary line
    if (/Dividends Earned in \d{4}:/i.test(text.substring(Math.max(0, match.index - 50), match.index))) {
      continue;
    }

    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    const amount = parseFloat(amountStr.replace(/,/g, ''));

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && amount > 0) {
      const date = new Date(statementYear, month - 1, day);

      transactions.push({
        date,
        description: 'Logix Federal Credit Union - Dividend Income',
        amount,
        type: 'RECEIPT',
        source: 'Logix Credit Union',
        rawLine: fullMatch
      });
    }
  }

  console.log(`[Logix Parser] Parsed ${transactions.length} dividend transactions`);

  return transactions;
}

/**
 * Validate results for court filing
 */
export function validateResults(transactions: ParsedTransaction[]): string[] {
  const warnings: string[] = [];

  // Must have substantial transactions for 2-year period
  if (transactions.length < 500) {
    warnings.push(`CRITICAL: Only ${transactions.length} transactions found. Expected 1,000+ for 2-year period`);
  }

  const bofaTransactions = transactions.filter(t => t.source === 'Bank of America');
  const logixTransactions = transactions.filter(t => t.source === 'Logix Credit Union');

  console.log(`[Validation] BofA: ${bofaTransactions.length}, Logix: ${logixTransactions.length}`);

  // Check for garbage that slipped through
  const suspiciousDescriptions = transactions.filter(t =>
    t.description.length < 5 ||
    /449444600|JUMBO CERTIFICATE|PROMO CERTIFICATE/i.test(t.description) ||
    /ATM and debit card/i.test(t.description)
  );

  if (suspiciousDescriptions.length > 0) {
    warnings.push(`WARNING: ${suspiciousDescriptions.length} suspicious transactions detected (possible headers/garbage)`);
    console.log('[Validation] Suspicious:', suspiciousDescriptions.slice(0, 5));
  }

  // Totals
  const receipts = transactions.filter(t => t.type === 'RECEIPT');
  const disbursements = transactions.filter(t => t.type === 'DISBURSEMENT');
  const totalReceipts = receipts.reduce((sum, t) => sum + t.amount, 0);
  const totalDisbursements = disbursements.reduce((sum, t) => sum + t.amount, 0);

  if (totalReceipts < 100000) {
    warnings.push(`WARNING: Total receipts $${totalReceipts.toLocaleString()} seems low for trust account`);
  }

  return warnings;
}
