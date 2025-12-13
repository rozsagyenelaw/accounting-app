/**
 * Bank Statement Parser V2 - OCR-Friendly Line-by-Line Scanner
 * Handles messy OCR output where dates, descriptions, and amounts are on separate lines
 */

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'RECEIPT' | 'DISBURSEMENT';
  rawLines: string[];
  confidence: number;
}

// ============================================================================
// DATE PARSING
// ============================================================================

interface ParsedDate {
  month: number;
  day: number;
  year: number;
  lineIndex: number;
  rawText: string;
}

function extractDate(text: string, lineIndex: number): ParsedDate | null {
  // Match MM/DD/YY or MM/DD/YYYY with possible spaces and artifacts
  const match = text.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/);
  if (!match) return null;

  let month = parseInt(match[1], 10);
  let day = parseInt(match[2], 10);
  let year = parseInt(match[3], 10);

  // Fix 2-digit years
  if (year < 100) {
    year = year >= 50 ? 1900 + year : 2000 + year;
  }

  // Validate
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 2020 || year > 2030) return null;

  return { month, day, year, lineIndex, rawText: match[0] };
}

// ============================================================================
// AMOUNT PARSING
// ============================================================================

interface ParsedAmount {
  value: number;
  isNegative: boolean;
  lineIndex: number;
  rawText: string;
}

function extractAmount(text: string, lineIndex: number): ParsedAmount | null {
  // Match amounts: -$1,234.56 or 1234.56 or -1,234.56
  const match = text.match(/(-)?(\$)?([\d,]+\.\d{2})/);
  if (!match) return null;

  const value = parseFloat(match[3].replace(/,/g, ''));
  if (isNaN(value) || value === 0) return null;

  // Check if negative (either has - prefix or just negative sign)
  const isNegative = !!match[1] || text.trim().startsWith('-');

  return {
    value,
    isNegative,
    lineIndex,
    rawText: match[0]
  };
}

// ============================================================================
// DESCRIPTION EXTRACTION - GENERIC (NO HARDCODED MERCHANTS)
// ============================================================================

function extractDescription(text: string, lineIndex: number): { text: string; lineIndex: number } | null {
  const trimmed = text.trim();

  // Skip if line is too short to be a description
  if (trimmed.length < 5) return null;

  // Skip obvious header lines
  const lower = trimmed.toLowerCase();
  if (lower.includes('description') ||
      lower.includes('date') ||
      lower.includes('amount') ||
      lower.includes('balance') ||
      lower.includes('beginning') ||
      lower.includes('ending') ||
      lower.includes('total') ||
      lower.includes('page') ||
      lower.match(/^\d+$/)) { // Just a number
    return null;
  }

  // Generic indicators that this is a transaction description:
  // - Contains transaction keywords
  // - Has uppercase text (merchant names)
  // - Contains common transaction patterns
  const hasTransactionKeyword = /PURCHASE|CHECKCARD|DEBIT|CHECK|PAYMENT|TRANSFER|WIRE|DEPOSIT|WITHDRAWAL|ATM|POS|ACH/i.test(trimmed);
  const hasUpperCase = /[A-Z]{3,}/.test(trimmed); // At least 3 consecutive uppercase letters
  const hasCheckNumber = /#?\d{3,}/.test(trimmed); // Check numbers or reference numbers
  const hasLocation = /\b[A-Z]{2}\b/.test(trimmed); // State abbreviations like CA, NY

  // If line has transaction characteristics, it's likely a description
  if (hasTransactionKeyword || (hasUpperCase && trimmed.length > 10) || hasCheckNumber) {
    return {
      text: trimmed,
      lineIndex
    };
  }

  return null;
}

// ============================================================================
// RECEIPT DETECTION - GENERIC (BASED ON KEYWORDS, NOT HARDCODED MERCHANTS)
// ============================================================================

function isReceiptTransaction(description: string): boolean {
  // Generic receipt indicators (money coming IN):
  const receiptPatterns = [
    /DEPOSIT/i,
    /CREDIT/i,
    /REFUND/i,
    /INTEREST/i,
    /DIVIDEND/i,
    /WIRE.*IN/i,
    /TRANSFER.*IN/i,
    /ACH.*CREDIT/i,
    /PAYROLL/i,
    /SALARY/i,
    /PENSION/i,
    /ANNUIT/i,
    /SOCIAL\s+SECURITY/i,
    /SSA/i,
    /REIMBURSEMENT/i,
    /RETURN/i,
  ];

  return receiptPatterns.some(p => p.test(description));
}

// ============================================================================
// MAIN PARSER - LINE-BY-LINE SCANNER
// ============================================================================

export function parseBankStatementOCR(text: string): ParsedTransaction[] {
  console.log(`[OCR Parser] Starting line-by-line scan of ${text.length} characters`);

  const lines = text.split('\n');
  console.log(`[OCR Parser] Processing ${lines.length} lines`);

  // Extract all dates, descriptions, and amounts with their line numbers
  const dates: ParsedDate[] = [];
  const descriptions: ReturnType<typeof extractDescription>[] = [];
  const amounts: ParsedAmount[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Try to extract date
    const date = extractDate(line, i);
    if (date) {
      dates.push(date);
    }

    // Try to extract description
    const desc = extractDescription(line, i);
    if (desc) {
      descriptions.push(desc);
    }

    // Try to extract amount
    const amount = extractAmount(line, i);
    if (amount) {
      amounts.push(amount);
    }
  }

  console.log(`[OCR Parser] Found ${dates.length} dates, ${descriptions.length} descriptions, ${amounts.length} amounts`);

  // Now match them using proximity
  const transactions: ParsedTransaction[] = [];
  const usedAmounts = new Set<number>();

  for (const date of dates) {
    // Find nearest description within 10 lines
    const nearbyDescriptions = descriptions.filter(d =>
      d !== null && Math.abs(d.lineIndex - date.lineIndex) <= 10
    );

    if (nearbyDescriptions.length === 0) continue;

    // Prefer description on same line or next line
    nearbyDescriptions.sort((a, b) =>
      a && b ? Math.abs(a.lineIndex - date.lineIndex) - Math.abs(b.lineIndex - date.lineIndex) : 0
    );

    const description = nearbyDescriptions[0];
    if (!description) continue;

    // Find nearest amount within 10 lines of description
    const nearbyAmounts = amounts.filter(a =>
      Math.abs(a.lineIndex - description.lineIndex) <= 10 &&
      !usedAmounts.has(a.lineIndex)
    );

    if (nearbyAmounts.length === 0) continue;

    // Prefer amount on same line or next few lines
    nearbyAmounts.sort((a, b) =>
      Math.abs(a.lineIndex - description.lineIndex) - Math.abs(b.lineIndex - description.lineIndex)
    );

    const amount = nearbyAmounts[0];

    // Mark amount as used
    usedAmounts.add(amount.lineIndex);

    // Determine transaction type based on description keywords
    const isReceipt = isReceiptTransaction(description.text);
    const type: 'RECEIPT' | 'DISBURSEMENT' = isReceipt ? 'RECEIPT' : 'DISBURSEMENT';

    // Calculate confidence based on proximity
    const dateDescDistance = Math.abs(date.lineIndex - description.lineIndex);
    const descAmountDistance = Math.abs(description.lineIndex - amount.lineIndex);
    const totalDistance = dateDescDistance + descAmountDistance;
    const confidence = Math.max(50, 100 - (totalDistance * 5));

    // Create date object
    const dateObj = new Date(date.year, date.month - 1, date.day);

    transactions.push({
      date: dateObj,
      description: description.text,
      amount: amount.value,
      type,
      rawLines: [
        lines[date.lineIndex],
        lines[description.lineIndex],
        lines[amount.lineIndex]
      ],
      confidence
    });
  }

  console.log(`[OCR Parser] Created ${transactions.length} transactions from proximity matching`);

  // Sort by date
  transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Log sample transactions
  if (transactions.length > 0) {
    console.log('[OCR Parser] Sample transactions:');
    for (let i = 0; i < Math.min(5, transactions.length); i++) {
      const t = transactions[i];
      console.log(`  ${t.date.toISOString().split('T')[0]} | ${t.type} | $${t.amount.toFixed(2)} | ${t.description.substring(0, 50)}`);
    }
  }

  return transactions;
}

// ============================================================================
// VALIDATION
// ============================================================================

export function validateResults(transactions: ParsedTransaction[]): string[] {
  const warnings: string[] = [];

  if (transactions.length < 100) {
    warnings.push(`WARNING: Only ${transactions.length} transactions found. Expected 1,000+ for 2-year period`);
  }

  const receipts = transactions.filter(t => t.type === 'RECEIPT');
  const disbursements = transactions.filter(t => t.type === 'DISBURSEMENT');

  const totalReceipts = receipts.reduce((sum, t) => sum + t.amount, 0);
  const totalDisbursements = disbursements.reduce((sum, t) => sum + t.amount, 0);

  console.log(`[OCR Parser] Receipts: ${receipts.length} transactions, $${totalReceipts.toLocaleString()}`);
  console.log(`[OCR Parser] Disbursements: ${disbursements.length} transactions, $${totalDisbursements.toLocaleString()}`);

  if (totalReceipts < 10000) {
    warnings.push(`WARNING: Total receipts $${totalReceipts.toFixed(2)} seems too low`);
  }

  const lowConfidence = transactions.filter(t => t.confidence < 60);
  if (lowConfidence.length > transactions.length * 0.2) {
    warnings.push(`WARNING: ${lowConfidence.length} transactions have low confidence (<60%)`);
  }

  return warnings;
}
