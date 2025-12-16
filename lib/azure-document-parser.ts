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

// NO FILTERS - User will manually review and delete unwanted transactions
// Internal transfers, duplicates, etc. will be handled manually in the UI

function isReceipt(description: string): boolean {
  return RECEIPT_PATTERNS.some(pattern => pattern.test(description));
}

function extractCheckNumber(description: string): string | undefined {
  // More robust check number extraction - try multiple patterns
  const patterns = [
    /(?:CHECK|CHK|CK)\s*#?\s*(\d+)/i,
    /\bCHECK\s+(\d+)/i,
    /\b#\s*(\d+)/,
    /CHECK\s+NO\.?\s*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) return match[1];
  }

  return undefined;
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

// ABSOLUTE MINIMUM validation - almost no filtering
function isValidTransaction(description: string, date: string | undefined): boolean {
  if (!date) return false;
  if (!description || description.trim().length === 0) return false;

  // ONLY filter single-word column headers (exact match)
  const singleWord = description.trim();
  if (/^(Date|Description|Amount|Deposit|Withdrawal|Balance|Check)$/i.test(singleWord)) return false;

  // Validate date is parseable
  const txnDate = new Date(date);
  if (isNaN(txnDate.getTime())) {
    console.log(`[Azure Parser] Invalid date: ${date} - ${description.substring(0, 50)}`);
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

  let totalRowsFound = 0;
  let rowsWithDateAmountDesc = 0;
  let rowsFiltered = 0;
  let rowsKept = 0;

  // PRE-PARSING COUNTER: Count what Azure found BEFORE any filtering
  const rawTransactionsByMonth: Record<string, number> = {};
  let rawTotalTransactions = 0;

  // Process all tables from all pages
  if (result.tables) {
    console.log(`[Azure Parser] Found ${result.tables.length} tables in PDF`);

    for (const table of result.tables) {
      // Skip tables that don't look like transaction tables
      if (table.columnCount < 2) continue;

      console.log(`[Azure Parser] Processing table with ${table.rowCount} rows, ${table.columnCount} columns`);

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

        totalRowsFound++;

        const values = Array.from(columns.values());
        const rowText = values.join(' ');

        // Try to extract date, description, amount from this row
        let date: string | undefined;
        let description: string | undefined;
        let amount: number | undefined;
        let partialDate: string | undefined; // For MM/DD format without year

        for (const value of values) {
          // Check for full date with year (MM/DD/YYYY or MM-DD-YYYY)
          if (!date && !partialDate && /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(value)) {
            date = parseDate(value);
          }
          // Check for partial date without year (MM/DD or MM-DD) - common in Logix statements
          else if (!date && !partialDate && /^\d{1,2}[\/\-]\d{1,2}$/.test(value.trim())) {
            partialDate = value.trim();
          }
          // Check for amount
          else if (!amount && /^-?\$?[\d,]+\.\d{2}$/.test(value.replace(/\s/g, ''))) {
            amount = parseAmount(value);
          }
          // Otherwise it's likely part of description
          // BUT: Don't add values that look like amounts (to avoid picking up "New Balance" column)
          else if (value.length > 3 && !/^\d+$/.test(value) && !/^-?\$?[\d,]+\.\d{2}$/.test(value.replace(/\s/g, ''))) {
            description = description ? `${description} ${value}` : value;
          }
        }

        // If we found a partial date (MM/DD), infer the year
        if (partialDate && !date) {
          // Infer year from current context - use 2024 for most transactions
          // If month >= 1-12, determine year based on when statement was generated
          const [month, day] = partialDate.split(/[\/\-]/).map(n => parseInt(n));

          // Use 2024 as default for historical transactions
          // If we're in early months (Jan-Mar) and the transaction is late in year (Oct-Dec),
          // it's likely from previous year
          const currentYear = new Date().getFullYear();
          const currentMonth = new Date().getMonth() + 1;

          let inferredYear = 2024; // Default to 2024 for historical data

          // If current year is 2025 and transaction month is >= April, use 2025
          if (currentYear >= 2025 && month >= 4) {
            inferredYear = 2025;
          }
          // If current year is 2025 and we're past the transaction month, likely it's from 2025
          else if (currentYear === 2025 && month <= currentMonth) {
            inferredYear = 2025;
          }

          date = parseDate(`${month}/${day}/${inferredYear}`);
          console.log(`[Azure Parser] Inferred year for Logix transaction: ${partialDate} → ${date} (${description?.substring(0, 40)}...)`);
        }

        // Debug: Log when we have partial data
        if (partialDate || (description && description.toLowerCase().includes('dividend'))) {
          console.log(`[Azure Parser] 📋 Row parsing: date=${date}, partialDate=${partialDate}, amount=${amount}, desc="${description?.substring(0, 40)}"`);
        }

        // Only create transaction if we have required fields
        if (date && amount && description) {
          rowsWithDateAmountDesc++;

          // COUNT BEFORE FILTERING - Track what Azure found
          rawTotalTransactions++;
          const monthKey = date.substring(0, 7); // YYYY-MM
          rawTransactionsByMonth[monthKey] = (rawTransactionsByMonth[monthKey] || 0) + 1;

          // Log potential Logix dividends for debugging
          if (description.toLowerCase().includes('dividend')) {
            console.log(`[Azure Parser] 🔍 LOGIX DIVIDEND CANDIDATE: ${date} | $${amount} | ${description.substring(0, 60)}`);
          }

          // Minimal validation - only skip obvious garbage
          if (!isValidTransaction(description, date)) {
            rowsFiltered++;
            console.log(`[Azure Parser] FILTERED: "${description.substring(0, 60)}..." (date: ${date})`);
            continue;
          }

          const type = isReceipt(description) ? "RECEIPT" : "DISBURSEMENT";
          const checkNumber = extractCheckNumber(description);

          rowsKept++;
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
  // Logix statements may also have dividends in text format
  if (result.paragraphs) {
    console.log(`[Azure Parser] Processing ${result.paragraphs.length} paragraphs for text-based transactions...`);

    // Parse text-based transactions as fallback
    const textTransactions = parseTextTransactions(result.paragraphs);
    console.log(`[Azure Parser] Found ${textTransactions.length} transactions in text/paragraphs`);

    // Add unique transactions (avoid duplicates)
    let addedFromText = 0;
    for (const txn of textTransactions) {
      const isDuplicate = transactions.some(t =>
        t.date === txn.date &&
        Math.abs(t.amount - txn.amount) < 0.01 &&
        t.description.substring(0, 20) === txn.description.substring(0, 20)
      );

      if (!isDuplicate) {
        transactions.push(txn);
        addedFromText++;
      }
    }

    if (addedFromText > 0) {
      console.log(`[Azure Parser] Added ${addedFromText} unique transactions from text parsing`);
      warnings.push(`✨ Added ${addedFromText} transactions from text parsing (not in tables)`);
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

  // Count by month and type for detailed verification
  const countsByMonth: Record<string, { receipts: number; disbursements: number; checks: number }> = {};
  let totalChecks = 0;

  for (const txn of transactions) {
    const monthKey = txn.date.substring(0, 7); // YYYY-MM
    if (!countsByMonth[monthKey]) {
      countsByMonth[monthKey] = { receipts: 0, disbursements: 0, checks: 0 };
    }
    if (txn.type === 'RECEIPT') {
      countsByMonth[monthKey].receipts++;
    } else {
      countsByMonth[monthKey].disbursements++;
    }
    if (txn.checkNumber) {
      countsByMonth[monthKey].checks++;
      totalChecks++;
    }
  }

  // DETAILED PARSING REPORT
  console.log(`\n==================== AZURE PARSER REPORT ====================`);
  console.log(`\n📥 WHAT AZURE FOUND (BEFORE FILTERING):`);
  console.log(`   Total rows in tables: ${totalRowsFound}`);
  console.log(`   Rows with date+amount+description: ${rowsWithDateAmountDesc}`);
  console.log(`   RAW TRANSACTIONS FOUND: ${rawTotalTransactions}`);
  console.log(`\n   📅 RAW TRANSACTIONS BY MONTH:`);
  const rawSortedMonths = Object.keys(rawTransactionsByMonth).sort();
  for (const month of rawSortedMonths) {
    console.log(`      ${month}: ${rawTransactionsByMonth[month]} transactions`);
  }

  console.log(`\n🔍 FILTERING:`);
  console.log(`   Filtered out (headers/garbage): ${rowsFiltered}`);
  console.log(`   Kept as valid transactions: ${rowsKept}`);

  console.log(`\n✅ FINAL PARSED RESULTS:`);
  console.log(`   Total Transactions: ${transactions.length}`);
  console.log(`   Total Receipts: ${transactions.filter(t => t.type === 'RECEIPT').length} ($${totalReceipts.toFixed(2)})`);
  console.log(`   Total Disbursements: ${transactions.filter(t => t.type === 'DISBURSEMENT').length} ($${totalDisbursements.toFixed(2)})`);
  console.log(`   Total Checks: ${totalChecks}`);

  console.log(`\n   📅 PARSED TRANSACTIONS BY MONTH:`);
  const sortedMonths = Object.keys(countsByMonth).sort();
  for (const month of sortedMonths) {
    const counts = countsByMonth[month];
    const total = counts.receipts + counts.disbursements;
    const rawCount = rawTransactionsByMonth[month] || 0;
    const diff = rawCount - total;
    console.log(`      ${month}: ${total} parsed (${counts.receipts}R + ${counts.disbursements}D + ${counts.checks}C) [${diff} filtered]`);
  }
  console.log(`============================================================\n`);

  // Add summary to warnings for user visibility
  warnings.push(`📊 AZURE FOUND: ${rawTotalTransactions} transactions BEFORE filtering`);
  warnings.push(`📊 PARSED: ${transactions.length} transactions AFTER filtering (${rowsFiltered} filtered out)`);
  warnings.push(`   • Receipts: ${transactions.filter(t => t.type === 'RECEIPT').length}, Disbursements: ${transactions.filter(t => t.type === 'DISBURSEMENT').length}, Checks: ${totalChecks}`);

  if (transactions.length < 100) {
    warnings.push(`⚠️ Only ${transactions.length} transactions found. This seems low - verify PDF has transaction tables.`);
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

  // Pattern to match transaction formats
  const datePattern = /(\d{1,2}\/\d{1,2}\/\d{2,4})/;
  const amountPattern = /\$?([\d,]+\.\d{2})/;

  // APPROACH 1: Try to find transactions within single paragraphs (Bank of America format)
  for (const para of paragraphs) {
    const text = para.content || '';
    const dateMatch = text.match(datePattern);
    const amountMatches = text.match(new RegExp(amountPattern, 'g'));

    if (dateMatch && amountMatches && amountMatches.length > 0) {
      const date = parseDate(dateMatch[0]);
      const amount = parseAmount(amountMatches[amountMatches.length - 1]);

      let description = text
        .replace(new RegExp(datePattern, 'g'), '')
        .replace(new RegExp(amountPattern, 'g'), '')
        .replace(/\s+/g, ' ')
        .trim();

      if (description && amount > 0 && date) {
        if (!isValidTransaction(description, date)) {
          continue;
        }

        const type = isReceipt(description) ? "RECEIPT" : "DISBURSEMENT";
        transactions.push({
          date,
          description: description.substring(0, 200),
          amount,
          type,
          confidence: 0.7
        });
      }
    }
  }

  // APPROACH 2: Try to find Logix-style transactions across consecutive paragraphs
  // Format: Date paragraph, Description paragraph, Amount paragraph
  for (let i = 0; i < paragraphs.length - 2; i++) {
    const para1 = (paragraphs[i].content || '').trim();
    const para2 = (paragraphs[i + 1].content || '').trim();
    const para3 = (paragraphs[i + 2].content || '').trim();

    // Check if para1 is a date
    const dateMatch = para1.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})$/);
    if (!dateMatch) continue;

    // Check if para2 contains "dividend" or "deposit"
    if (!para2.match(/dividend|deposit/i)) continue;

    // Check if para3 is an amount
    const amountMatch = para3.match(/^\$?([\d,]+\.\d{2})$/);
    if (!amountMatch) continue;

    const date = parseDate(dateMatch[1]);
    const amount = parseAmount(amountMatch[0]);
    const description = para2;

    if (date && amount > 0 && description) {
      if (!isValidTransaction(description, date)) {
        continue;
      }

      const type = isReceipt(description) ? "RECEIPT" : "DISBURSEMENT";

      transactions.push({
        date,
        description: description.substring(0, 200),
        amount,
        type,
        confidence: 0.8 // Higher confidence for structured multi-line format
      });
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

    // Skip if date parsing failed
    if (!date) continue;

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
