import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";

interface Transaction {
  date: string;           // YYYY-MM-DD format
  description: string;
  amount: number;
  type: "RECEIPT" | "DISBURSEMENT";
  category?: string;      // GC-400 category (optional - will be assigned by parse route)
  checkNumber?: string;
  confidence: number;
}

interface ParseResult {
  transactions: Transaction[];
  totalReceipts: number;
  totalDisbursements: number;
  beginningBalance?: number;
  endingBalance?: number;
  warnings: string[];
}

// Receipt patterns - money coming IN
const RECEIPT_PATTERNS = [
  /SSA TREAS/i,
  /SOC SEC/i,
  /SOCIAL SECURITY/i,
  /FLETCHER JONES/i,
  /WIRE.*IN/i,
  /WIRE TYPE:WIRE IN/i,
  /Interest Earned/i,
  /INTEREST PAYMENT/i,
  /DEPOSIT DIVIDEND/i,  // Logix credit union dividends
  /DIVIDEND/i,
  /DEPOSIT/i,
  /REFUND/i,
  /CREDIT/i,
  /TAX REF/i,
  /IRS TREAS/i,
];

// Internal transfer patterns - these should be EXCLUDED from both receipts and disbursements
const INTERNAL_TRANSFER_PATTERNS = [
  /TRANSFER\s+TO\s+SHARE/i,
  /TRANSFER\s+FROM\s+SHARE/i,
  /LOGIX.*TRANSFER/i,
  /TRANSFER.*LOGIX/i,
  /INTERNAL\s+TRANSFER/i,
  /ACCOUNT\s+TRANSFER/i,
  /TRANSFER\s+BETWEEN/i,

  // Logix FCU transfers (pattern: "LOGIX FCU DES:LOGIX" = transfer TO Logix)
  /LOGIX\s+FCU.*DES:LOGIX/i,
  /DES:LOGIX/i,

  // Bank of America appearing in Logix statements = transfer FROM BofA
  /BANK\s+OF\s+AM/i,
  /BANKOFAM/i,
  /WIRE.*BANK.*AM/i,

  // Wire transfers between accounts
  /WIRE.*TYPE.*WIRE\s+OUT.*LOGIX/i,
  /WIRE.*TYPE.*WIRE\s+IN.*BANK/i,
];

function isInternalTransfer(description: string): boolean {
  // Pattern-based detection only - catches ANY internal transfer regardless of amount
  return INTERNAL_TRANSFER_PATTERNS.some(pattern => pattern.test(description));
}

function isReceipt(description: string): boolean {
  return RECEIPT_PATTERNS.some(pattern => pattern.test(description));
}

function extractCheckNumber(description: string): string | undefined {
  const match = description.match(/(?:CHECK|CHK|CK)\s*#?\s*(\d+)/i);
  return match ? match[1] : undefined;
}

function parseDate(dateStr: string): string | undefined {
  // Handle various date formats from bank statements
  // MM/DD/YY, MM/DD/YYYY, MM-DD-YY, etc.
  const cleaned = dateStr.replace(/\s+/g, '').trim();

  let match = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (match) {
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    let year = match[3];

    // Convert 2-digit year to 4-digit
    if (year.length === 2) {
      const yearNum = parseInt(year);
      year = yearNum >= 0 && yearNum <= 30 ? `20${year}` : `19${year}`;
    }

    return `${year}-${month}-${day}`;
  }

  return undefined; // Return undefined if parsing fails
}

// Validate that transaction is within the accounting period and not OCR garbage
function isValidTransaction(description: string, date: string | undefined): boolean {
  // Filter out OCR garbage from Logix statements (summary text mistaken as transactions)
  if (!date) return false;

  if (/dividends?\s+earned\s+in/i.test(description)) return false;
  if (/current\s+balance:/i.test(description)) return false;
  if (/matures?\s+on:/i.test(description)) return false;
  if (/account\s+summary/i.test(description)) return false;
  if (/statement\s+period/i.test(description)) return false;
  if (/beginning\s+balance/i.test(description)) return false;
  if (/ending\s+balance/i.test(description)) return false;

  // Validate date is within reasonable accounting period (2023-08-22 to 2025-08-20)
  const txnDate = new Date(date);
  const startDate = new Date('2023-08-22');
  const endDate = new Date('2025-08-20');

  if (txnDate < startDate || txnDate > endDate) {
    console.log(`[Azure Parser] Skipping transaction with date outside period: ${date} - ${description.substring(0, 50)}`);
    return false;
  }

  return true;
}

function parseAmount(amountStr: string): number {
  // Remove currency symbols, commas, spaces
  const cleaned = amountStr.replace(/[$,\s]/g, '');
  return Math.abs(parseFloat(cleaned));
}

export async function parseWithAzure(pdfBuffer: Buffer): Promise<ParseResult> {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

  if (!endpoint || !key) {
    throw new Error("Azure Document Intelligence credentials not configured");
  }

  const client = new DocumentAnalysisClient(
    endpoint,
    new AzureKeyCredential(key)
  );

  // Use prebuilt-layout model for table extraction
  const poller = await client.beginAnalyzeDocument("prebuilt-layout", pdfBuffer);
  const result = await poller.pollUntilDone();

  const transactions: Transaction[] = [];
  const warnings: string[] = [];

  // Process all tables from all pages
  if (result.tables) {
    for (const table of result.tables) {
      // Skip tables that don't look like transaction tables
      if (table.columnCount < 2) continue;

      // Build rows from cells
      const rows: Map<number, Map<number, string>> = new Map();

      for (const cell of table.cells) {
        if (!rows.has(cell.rowIndex)) {
          rows.set(cell.rowIndex, new Map());
        }
        rows.get(cell.rowIndex)!.set(cell.columnIndex, cell.content || '');
      }

      // Process each row as potential transaction
      for (const [rowIndex, columns] of rows) {
        // Skip header rows
        if (rowIndex === 0) continue;

        const values = Array.from(columns.values());
        const rowText = values.join(' ');

        // Try to extract date, description, amount from this row
        let date: string | undefined;
        let description: string | undefined;
        let amount: number | undefined;

        for (const value of values) {
          // Check for date
          if (!date && /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(value)) {
            date = parseDate(value);
          }
          // Check for amount
          else if (!amount && /^-?\$?[\d,]+\.\d{2}$/.test(value.replace(/\s/g, ''))) {
            amount = parseAmount(value);
          }
          // Otherwise it's likely part of description
          else if (value.length > 3 && !/^\d+$/.test(value)) {
            description = description ? `${description} ${value}` : value;
          }
        }

        // Only create transaction if we have required fields
        if (date && amount && description) {
          // Validate transaction (filter OCR garbage and invalid dates)
          if (!isValidTransaction(description, date)) {
            continue;
          }

          // SKIP internal transfers - they are not income or expenses
          if (isInternalTransfer(description)) {
            console.log(`[Azure Parser] Skipping internal transfer: ${description.substring(0, 60)}... ($${amount})`);
            continue;
          }

          const type = isReceipt(description) ? "RECEIPT" : "DISBURSEMENT";
          const checkNumber = extractCheckNumber(description);

          transactions.push({
            date,
            description: description.substring(0, 200), // Truncate long descriptions
            amount,
            type,
            // category will be assigned by parse route using gc400-categories.ts
            checkNumber,
            confidence: 0.95 // Azure generally has high confidence
          });
        }
      }
    }
  }

  // Also extract transactions from paragraphs/text if tables didn't capture everything
  // Bank of America sometimes has transactions in text format, not tables
  if (result.paragraphs && transactions.length < 100) {
    // Parse text-based transactions as fallback
    const textTransactions = parseTextTransactions(result.paragraphs);

    // Add unique transactions (avoid duplicates)
    for (const txn of textTransactions) {
      const isDuplicate = transactions.some(t =>
        t.date === txn.date &&
        Math.abs(t.amount - txn.amount) < 0.01 &&
        t.description.substring(0, 20) === txn.description.substring(0, 20)
      );

      if (!isDuplicate) {
        transactions.push(txn);
      }
    }
  }

  // Calculate totals
  let totalReceipts = 0;
  let totalDisbursements = 0;

  for (const txn of transactions) {
    if (txn.type === "RECEIPT") {
      totalReceipts += txn.amount;
    } else {
      totalDisbursements += txn.amount;
    }
  }

  // Sort by date
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  // Add warnings if transaction count seems low
  if (transactions.length < 500) {
    warnings.push(`Only ${transactions.length} transactions found. Expected ~800-1000 for 2-year period.`);
  }

  return {
    transactions,
    totalReceipts: Math.round(totalReceipts * 100) / 100,
    totalDisbursements: Math.round(totalDisbursements * 100) / 100,
    warnings
  };
}

function parseTextTransactions(paragraphs: any[]): Transaction[] {
  const transactions: Transaction[] = [];

  // Pattern to match Bank of America transaction format in text
  // Date + Description + Amount on same or nearby lines
  const datePattern = /(\d{1,2}\/\d{1,2}\/\d{2,4})/g;
  const amountPattern = /-?\$?([\d,]+\.\d{2})/g;

  for (const para of paragraphs) {
    const text = para.content || '';

    // Check if this paragraph contains transaction data
    const dates = text.match(datePattern);
    const amounts = text.match(amountPattern);

    if (dates && amounts && dates.length > 0 && amounts.length > 0) {
      // Try to pair dates with amounts
      // This is a simplified approach - Azure tables are more reliable
      const date = parseDate(dates[0]);
      const amount = parseAmount(amounts[amounts.length - 1]); // Last amount is usually the transaction amount

      // Extract description (text between date and amount)
      let description = text
        .replace(datePattern, '')
        .replace(amountPattern, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (description && amount > 0) {
        // Validate transaction (filter OCR garbage and invalid dates)
        if (!isValidTransaction(description, date)) {
          continue;
        }

        // SKIP internal transfers
        if (isInternalTransfer(description)) {
          continue;
        }

        const type = isReceipt(description) ? "RECEIPT" : "DISBURSEMENT";

        transactions.push({
          date,
          description: description.substring(0, 200),
          amount,
          type,
          // category will be assigned by parse route
          confidence: 0.7 // Lower confidence for text parsing
        });
      }
    }
  }

  return transactions;
}

// Export for Excel fallback if user uploads Excel instead of PDF
export async function parseExcelFile(buffer: Buffer): Promise<ParseResult> {
  // Import xlsx library
  const XLSX = await import('xlsx');

  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  const transactions: Transaction[] = [];
  const warnings: string[] = [];

  // Find header row and column indices
  let headerRow = -1;
  let dateCol = -1;
  let descCol = -1;
  let debitCol = -1;
  let creditCol = -1;
  let amountCol = -1;

  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;

    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || '').toLowerCase();
      if (cell.includes('date')) dateCol = j;
      if (cell.includes('description') || cell.includes('memo')) descCol = j;
      if (cell.includes('debit') || cell.includes('withdrawal')) debitCol = j;
      if (cell.includes('credit') || cell.includes('deposit')) creditCol = j;
      if (cell.includes('amount') && amountCol === -1) amountCol = j;
    }

    if (dateCol >= 0 && (descCol >= 0 || amountCol >= 0)) {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    warnings.push('Could not identify column headers in Excel file');
    return { transactions: [], totalReceipts: 0, totalDisbursements: 0, warnings };
  }

  // Process data rows
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const dateVal = row[dateCol];
    const descVal = row[descCol >= 0 ? descCol : 0];

    // Get amount from debit/credit columns or single amount column
    let amount = 0;
    let type: "RECEIPT" | "DISBURSEMENT" = "DISBURSEMENT";

    if (debitCol >= 0 && creditCol >= 0) {
      const debit = parseFloat(String(row[debitCol] || '0').replace(/[$,]/g, '')) || 0;
      const credit = parseFloat(String(row[creditCol] || '0').replace(/[$,]/g, '')) || 0;

      if (credit > 0) {
        amount = credit;
        type = "RECEIPT";
      } else {
        amount = debit;
        type = "DISBURSEMENT";
      }
    } else if (amountCol >= 0) {
      amount = Math.abs(parseFloat(String(row[amountCol] || '0').replace(/[$,]/g, ''))) || 0;
      type = isReceipt(String(descVal)) ? "RECEIPT" : "DISBURSEMENT";
    }

    if (!dateVal || !amount) continue;

    const description = String(descVal || '');
    const date = parseDate(String(dateVal));

    // Override type detection based on description
    if (isReceipt(description)) type = "RECEIPT";

    transactions.push({
      date,
      description: description.substring(0, 200),
      amount: Math.abs(amount),
      type,
      // category will be assigned by parse route
      checkNumber: extractCheckNumber(description),
      confidence: 0.99 // Excel data is very reliable
    });
  }

  let totalReceipts = 0;
  let totalDisbursements = 0;

  for (const txn of transactions) {
    if (txn.type === "RECEIPT") {
      totalReceipts += txn.amount;
    } else {
      totalDisbursements += txn.amount;
    }
  }

  transactions.sort((a, b) => a.date.localeCompare(b.date));

  return {
    transactions,
    totalReceipts: Math.round(totalReceipts * 100) / 100,
    totalDisbursements: Math.round(totalDisbursements * 100) / 100,
    warnings
  };
}
