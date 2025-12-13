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
// DESCRIPTION PATTERNS
// ============================================================================

const MERCHANT_PATTERNS = [
  // Groceries
  { pattern: /SPROUTS\s+FARMER/i, category: 'grocery' },
  { pattern: /TRADER\s+JOE/i, category: 'grocery' },
  { pattern: /RALPHS/i, category: 'grocery' },
  { pattern: /GELSON/i, category: 'grocery' },
  { pattern: /VONS/i, category: 'grocery' },
  { pattern: /VINTAGE\s+GROCER/i, category: 'grocery' },
  { pattern: /WHOLE\s+FOODS/i, category: 'grocery' },
  { pattern: /TAPIA\s+BROS/i, category: 'grocery' },

  // Receipts - Income
  { pattern: /SSA\s+TREAS/i, category: 'receipt', isReceipt: true },
  { pattern: /FLETCHER\s+JONES/i, category: 'receipt', isReceipt: true },
  { pattern: /Interest\s+Earned/i, category: 'receipt', isReceipt: true },
  { pattern: /WIRE.*IN/i, category: 'receipt', isReceipt: true },
  { pattern: /DEPOSIT/i, category: 'receipt', isReceipt: true },
  { pattern: /REFUND/i, category: 'receipt', isReceipt: true },

  // Utilities
  { pattern: /SPECTRUM/i, category: 'utility' },
  { pattern: /CHARTER\s+COMMUN/i, category: 'utility' },
  { pattern: /SOCALGAS/i, category: 'utility' },
  { pattern: /LADWP/i, category: 'utility' },
  { pattern: /\bDWP\b/i, category: 'utility' },

  // Home Improvement
  { pattern: /HOME\s+DEPOT/i, category: 'home' },
  { pattern: /LOWE'?S/i, category: 'home' },

  // Restaurants
  { pattern: /SHARKY/i, category: 'dining' },
  { pattern: /SHAKE\s+SHACK/i, category: 'dining' },
  { pattern: /STARBUCKS/i, category: 'dining' },
  { pattern: /CHIPOTLE/i, category: 'dining' },
  { pattern: /BAJA\s+FRESH/i, category: 'dining' },
  { pattern: /FATBURGER/i, category: 'dining' },
  { pattern: /OUTBACK/i, category: 'dining' },

  // Medical
  { pattern: /\bCVS\b/i, category: 'medical' },
  { pattern: /WALGREENS/i, category: 'medical' },
  { pattern: /PHARMACY/i, category: 'medical' },

  // Fitness
  { pattern: /LA\s+FITNESS/i, category: 'fitness' },
  { pattern: /\bGYM\b/i, category: 'fitness' },

  // Online Shopping
  { pattern: /AMAZON/i, category: 'shopping' },
  { pattern: /\bAMZN\b/i, category: 'shopping' },

  // General transaction types
  { pattern: /PURCHASE/i, category: 'purchase' },
  { pattern: /CHECKCARD/i, category: 'purchase' },
  { pattern: /DEBIT\s+CARD/i, category: 'purchase' },
  { pattern: /CHECK\s+#?\d+/i, category: 'check' },
];

function extractDescription(text: string, lineIndex: number): { text: string; isReceipt: boolean; lineIndex: number } | null {
  // Check if line contains any merchant pattern
  for (const { pattern, isReceipt } of MERCHANT_PATTERNS) {
    if (pattern.test(text)) {
      return {
        text: text.trim(),
        isReceipt: isReceipt || false,
        lineIndex
      };
    }
  }

  // Check for generic transaction indicators
  if (/PURCHASE|CHECKCARD|DEBIT|CHECK|PAYMENT|TRANSFER|WIRE/i.test(text)) {
    // Only if line has substantial content (not just the keyword)
    if (text.trim().length > 15) {
      return {
        text: text.trim(),
        isReceipt: false,
        lineIndex
      };
    }
  }

  return null;
}

// ============================================================================
// RECEIPT DETECTION
// ============================================================================

function isReceiptTransaction(description: string): boolean {
  const receiptPatterns = [
    /SSA\s+TREAS/i,
    /\bSSA\b/i,
    /FLETCHER\s+JONES/i,
    /Interest\s+Earned/i,
    /WIRE.*IN/i,
    /DEPOSIT/i,
    /REFUND/i,
    /SOC\s+SEC/i,
    /SOCIAL\s+SECURITY/i,
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

    // Determine transaction type
    const isReceipt = isReceiptTransaction(description.text) || description.isReceipt;
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
