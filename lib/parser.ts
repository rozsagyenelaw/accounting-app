import Papa from 'papaparse';
import { parse, isValid } from 'date-fns';
import type { Transaction } from '@/types';

// ============================================================================
// Parser Types
// ============================================================================

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'RECEIPT' | 'DISBURSEMENT';
}

export interface ParserResult {
  transactions: ParsedTransaction[];
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Date Parsing
// ============================================================================

const DATE_FORMATS = [
  'MM/dd/yyyy',
  'MM-dd-yyyy',
  'M/d/yyyy',
  'M-d-yyyy',
  'yyyy-MM-dd',
  'MM/dd/yy',
  'MM-dd-yy',
  'M/d/yy',
  'M-d-yy',
];

function parseDate(dateStr: string): Date | null {
  const trimmed = dateStr.trim();

  for (const format of DATE_FORMATS) {
    try {
      const parsed = parse(trimmed, format, new Date());
      if (isValid(parsed)) {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  return null;
}

// ============================================================================
// Amount Parsing
// ============================================================================

function parseAmount(amountStr: string): number | null {
  // Remove currency symbols, commas, and spaces
  let cleaned = amountStr.trim().replace(/[$,\s]/g, '');

  // Handle parentheses as negative (common in accounting)
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (isNegative) {
    cleaned = cleaned.slice(1, -1);
  }

  // Handle explicit negative sign
  const hasNegativeSign = cleaned.startsWith('-');
  if (hasNegativeSign) {
    cleaned = cleaned.slice(1);
  }

  const amount = parseFloat(cleaned);

  if (isNaN(amount)) {
    return null;
  }

  return (isNegative || hasNegativeSign) ? -amount : amount;
}

// ============================================================================
// CSV Parser
// ============================================================================

export async function parseCSV(file: File): Promise<ParserResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const transactions: ParsedTransaction[] = [];

  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Record<string, string>[];

        // Try to detect column names (different banks use different headers)
        const headers = Object.keys(data[0] || {}).map(h => h.toLowerCase());

        // Common column name variations
        const dateCol = headers.find(h =>
          h.includes('date') || h.includes('posted') || h.includes('trans date')
        );
        const descCol = headers.find(h =>
          h.includes('description') || h.includes('memo') || h.includes('detail') || h.includes('payee')
        );
        const amountCol = headers.find(h =>
          h.includes('amount') && !h.includes('balance')
        );
        const debitCol = headers.find(h => h.includes('debit') || h.includes('withdrawal'));
        const creditCol = headers.find(h => h.includes('credit') || h.includes('deposit'));

        if (!dateCol) {
          errors.push('Could not find date column in CSV');
          resolve({ transactions, errors, warnings });
          return;
        }

        if (!descCol) {
          errors.push('Could not find description column in CSV');
          resolve({ transactions, errors, warnings });
          return;
        }

        // Process each row
        data.forEach((row, index) => {
          const rowNum = index + 2; // Account for header and 0-indexing

          // Parse date
          const dateStr = row[dateCol];
          if (!dateStr) {
            warnings.push(`Row ${rowNum}: Missing date`);
            return;
          }

          const date = parseDate(dateStr);
          if (!date) {
            errors.push(`Row ${rowNum}: Invalid date format: ${dateStr}`);
            return;
          }

          // Get description
          const description = row[descCol]?.trim();
          if (!description) {
            warnings.push(`Row ${rowNum}: Missing description`);
            return;
          }

          // Parse amount
          let amount: number | null = null;
          let type: 'RECEIPT' | 'DISBURSEMENT' = 'DISBURSEMENT';

          // Try single amount column first
          if (amountCol && row[amountCol]) {
            amount = parseAmount(row[amountCol]);
            if (amount !== null) {
              type = amount > 0 ? 'RECEIPT' : 'DISBURSEMENT';
              amount = Math.abs(amount);
            }
          }

          // Try separate debit/credit columns
          if (amount === null && debitCol && creditCol) {
            const debitStr = row[debitCol];
            const creditStr = row[creditCol];

            if (debitStr && debitStr.trim()) {
              amount = parseAmount(debitStr);
              type = 'DISBURSEMENT';
            } else if (creditStr && creditStr.trim()) {
              amount = parseAmount(creditStr);
              type = 'RECEIPT';
            }
          }

          if (amount === null || amount === 0) {
            warnings.push(`Row ${rowNum}: Could not parse amount`);
            return;
          }

          transactions.push({
            date,
            description,
            amount,
            type,
          });
        });

        if (transactions.length === 0 && errors.length === 0) {
          errors.push('No valid transactions found in CSV');
        }

        resolve({ transactions, errors, warnings });
      },
      error: (error) => {
        errors.push(`CSV parsing error: ${error.message}`);
        resolve({ transactions, errors, warnings });
      },
    });
  });
}

// ============================================================================
// PDF Parser
// ============================================================================

export async function parsePDF(file: File): Promise<ParserResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const transactions: ParsedTransaction[] = [];

  try {
    // Import pdf-parse dynamically to avoid issues with webpack
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const data = await pdfParse(buffer);
    const text = data.text;

    // This is a basic implementation - different banks have different PDF formats
    // A more robust solution would have bank-specific parsers

    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    // Common transaction patterns to look for
    // Pattern: Date Description Amount
    // Example: "01/15/2024 AMAZON.COM $45.67"
    const transactionPattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\-\$\(\)0-9,\.]+)\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(transactionPattern);

      if (match) {
        const [, dateStr, description, amountStr] = match;

        const date = parseDate(dateStr);
        if (!date) {
          warnings.push(`Line ${i + 1}: Could not parse date: ${dateStr}`);
          continue;
        }

        const amount = parseAmount(amountStr);
        if (amount === null || amount === 0) {
          warnings.push(`Line ${i + 1}: Could not parse amount: ${amountStr}`);
          continue;
        }

        const type: 'RECEIPT' | 'DISBURSEMENT' = amount > 0 ? 'RECEIPT' : 'DISBURSEMENT';

        transactions.push({
          date,
          description: description.trim(),
          amount: Math.abs(amount),
          type,
        });
      }
    }

    if (transactions.length === 0) {
      errors.push(
        'No transactions found in PDF. This may be due to unsupported PDF format. ' +
        'Please try exporting your bank statement as CSV for better results.'
      );
    } else {
      warnings.push(
        `Found ${transactions.length} transactions. Please review carefully as PDF parsing may miss some entries.`
      );
    }

    return { transactions, errors, warnings };
  } catch (error) {
    errors.push(`PDF parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { transactions, errors, warnings };
  }
}

// ============================================================================
// Main Parser Function
// ============================================================================

export async function parseStatement(file: File): Promise<ParserResult> {
  const fileType = file.name.toLowerCase();

  if (fileType.endsWith('.csv')) {
    return parseCSV(file);
  } else if (fileType.endsWith('.pdf')) {
    return parsePDF(file);
  } else {
    return {
      transactions: [],
      errors: [`Unsupported file type: ${file.name}. Please upload CSV or PDF files.`],
      warnings: [],
    };
  }
}

// ============================================================================
// Transaction Deduplication
// ============================================================================

export function deduplicateTransactions(transactions: ParsedTransaction[]): ParsedTransaction[] {
  const seen = new Set<string>();
  const unique: ParsedTransaction[] = [];

  for (const transaction of transactions) {
    // Create a signature for each transaction
    const signature = `${transaction.date.toISOString()}-${transaction.description}-${transaction.amount}`;

    if (!seen.has(signature)) {
      seen.add(signature);
      unique.push(transaction);
    }
  }

  return unique;
}

// ============================================================================
// Transaction Sorting
// ============================================================================

export function sortTransactions(transactions: ParsedTransaction[]): ParsedTransaction[] {
  // Handle both Date objects and string dates
  return [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
