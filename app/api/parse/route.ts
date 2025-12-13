import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { parse, isValid } from 'date-fns';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { extractTextFromScannedPDF, isScannedPDF } from '@/lib/ocr';

// Date parsing formats
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

function parseDate(dateStr: string, context?: string): Date | null {
  let trimmed = dateStr.trim();

  // OCR Fix: Handle dates where first digit is cut off by OCR
  // Examples: "0/04/23" -> "10/04/23", "0/11/23" -> "10/11/23" or "01/11/23"
  if (/^0\/\d{1,2}\/\d{2,4}$/.test(trimmed)) {
    // Try prepending "1" to make it "10/..."
    const candidate1 = '1' + trimmed;
    const parsed1 = tryParseDateFormats(candidate1);
    if (parsed1) {
      console.log(`[OCR Date Fix] "${trimmed}" -> "${candidate1}" (prepended "1")`);
      return parsed1;
    }

    // Also try "01/..." for dates like January
    const candidate2 = '01/' + trimmed.substring(2);
    const parsed2 = tryParseDateFormats(candidate2);
    if (parsed2) {
      console.log(`[OCR Date Fix] "${trimmed}" -> "${candidate2}" (changed to "01/")`);
      return parsed2;
    }
  }

  // OCR Fix: Handle dates starting with "0-"
  if (/^0-\d{1,2}-\d{2,4}$/.test(trimmed)) {
    const candidate = '1' + trimmed;
    const parsed = tryParseDateFormats(candidate);
    if (parsed) {
      console.log(`[OCR Date Fix] "${trimmed}" -> "${candidate}" (prepended "1")`);
      return parsed;
    }
  }

  // Try normal parsing
  const parsed = tryParseDateFormats(trimmed);
  if (parsed) {
    return parsed;
  }

  // Log failure with context for debugging
  console.log(`[Date Parse Failed] Could not parse date: "${trimmed}"${context ? ` | Context: ${context}` : ''}`);
  return null;
}

function tryParseDateFormats(dateStr: string): Date | null {
  for (const format of DATE_FORMATS) {
    try {
      const parsed = parse(dateStr, format, new Date());
      if (isValid(parsed)) {
        return parsed;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function parseAmount(amountStr: string): number | null {
  let cleaned = amountStr.trim().replace(/[$,\s]/g, '');

  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (isNegative) {
    cleaned = cleaned.slice(1, -1);
  }

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({
        transactions: [],
        errors: ['No file provided'],
        warnings: []
      }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      return await parseCSV(file);
    } else if (fileName.endsWith('.pdf')) {
      return await parsePDF(file);
    } else {
      return NextResponse.json({
        transactions: [],
        errors: ['Unsupported file type. Please upload CSV or PDF files.'],
        warnings: []
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Parse error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({
      transactions: [],
      errors: [
        'Failed to parse file: ' + (error instanceof Error ? error.message : 'Unknown error'),
        'Please try again or contact support if the issue persists.'
      ],
      warnings: []
    }, { status: 500 });
  }
}

async function parseCSV(file: File): Promise<NextResponse> {
  const text = await file.text();
  const errors: string[] = [];
  const warnings: string[] = [];
  const transactions: any[] = [];

  return new Promise<NextResponse>((resolve) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Record<string, string>[];

        const headers = Object.keys(data[0] || {}).map(h => h.toLowerCase());

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
          resolve(NextResponse.json({ transactions, errors, warnings }));
          return;
        }

        if (!descCol) {
          errors.push('Could not find description column in CSV');
          resolve(NextResponse.json({ transactions, errors, warnings }));
          return;
        }

        data.forEach((row, index) => {
          const rowNum = index + 2;

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

          const description = row[descCol]?.trim();
          if (!description) {
            warnings.push(`Row ${rowNum}: Missing description`);
            return;
          }

          let amount: number | null = null;
          let type: 'RECEIPT' | 'DISBURSEMENT' = 'DISBURSEMENT';

          if (amountCol && row[amountCol]) {
            amount = parseAmount(row[amountCol]);
            if (amount !== null) {
              type = amount > 0 ? 'RECEIPT' : 'DISBURSEMENT';
              amount = Math.abs(amount);
            }
          }

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
            date: date.toISOString(),
            description,
            amount,
            type,
          });
        });

        if (transactions.length === 0 && errors.length === 0) {
          errors.push('No valid transactions found in CSV');
        }

        resolve(NextResponse.json({ transactions, errors, warnings }));
      },
      error: (error: Error) => {
        errors.push(`CSV parsing error: ${error.message}`);
        resolve(NextResponse.json({ transactions, errors, warnings }));
      },
    });
  });
}

async function parsePDF(file: File): Promise<NextResponse> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const transactions: any[] = [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // First, try to extract text directly
    const data = await pdf(buffer);
    let text = data.text;

    // Check if PDF has extractable text or if it's scanned
    if (isScannedPDF(text)) {
      console.log('Scanned PDF detected, using OCR...');
      warnings.push('Scanned PDF detected. Using OCR to extract text. This may take a few minutes...');

      try {
        // Use OCR to extract text from scanned PDF
        text = await extractTextFromScannedPDF(buffer, {
          language: 'eng',
          pageLimit: 100,
        });

        console.log(`OCR completed. Extracted ${text.length} characters.`);

        if (text.trim().length < 50) {
          errors.push('OCR extracted minimal text from the PDF.');
          errors.push('This may indicate: (1) Very low scan quality, (2) Non-standard document format, or (3) Corrupted file');
          errors.push('For best results, ensure the PDF is scanned at 300 DPI or higher with good contrast');
          return NextResponse.json({ transactions, errors, warnings }, { status: 422 });
        }
      } catch (ocrError) {
        console.error('OCR error:', ocrError);
        console.error('OCR error stack:', ocrError instanceof Error ? ocrError.stack : 'No stack');

        const errorMessage = ocrError instanceof Error ? ocrError.message : 'Unknown error';

        // Provide specific, actionable error messages
        if (errorMessage.includes('pdftoppm') || errorMessage.includes('poppler')) {
          errors.push('PDF to image conversion failed.');
          errors.push('The server may be missing required PDF processing tools (poppler-utils).');
          errors.push('System administrator: Install poppler-utils package.');
        } else if (errorMessage.includes('tesseract') || errorMessage.includes('command not found')) {
          errors.push('Tesseract OCR engine is not available on this server.');
          errors.push('System administrator: Install tesseract-ocr package.');
        } else if (errorMessage.includes('timeout') || errorMessage.includes('maxBuffer')) {
          errors.push('OCR processing timed out - this PDF is too large or complex.');
          errors.push('Try processing fewer pages or splitting the document.');
        } else {
          errors.push('OCR processing failed: ' + errorMessage);
          errors.push('The system encountered an unexpected error during text extraction.');
        }

        return NextResponse.json({ transactions, errors, warnings }, { status: 500 });
      }
    }

    // Common bank statement transaction patterns
    // Enhanced patterns to match both text-based and OCR-extracted PDFs
    const transactionPatterns = [
      // Pattern 1: BofA OCR format - Date followed by description and amount at end of line
      // OCR-aware: Allows "0/" at start for dates where first digit is cut off
      // Example: "09/05/23 CHECKCARD 0902 BUILD.COM 800-375-3403 CA 7443565324508372076 244.19"
      // Example: "0/05/23 CHECKCARD..." (OCR artifact - first digit cut off)
      /^[*+\\vA!©1-]\s*(\d{1,2}\/\d{1,2}\/\d{2,4}|0\/\d{1,2}\/\d{2,4})\s+(.+?)\s+([-]?\d+[,\d]*\.\d{2})$/gm,

      // Pattern 2: Standard format - Date Description Amount
      // OCR-aware: Allows dates starting with "0/"
      /(\d{1,2}\/\d{1,2}\/\d{2,4}|0\/\d{1,2}\/\d{2,4})\s+(.+?)\s+([-+$]?\d+[,\d]*\.\d{2})/g,

      // Pattern 3: Date Description Debit Credit (two columns)
      // OCR-aware: Allows dates starting with "0/"
      /(\d{1,2}\/\d{1,2}\/\d{2,4}|0\/\d{1,2}\/\d{2,4})\s+(.+?)\s+(\d+[,\d]*\.\d{2})\s+(\d+[,\d]*\.\d{2})/g,
    ];

    let matchFound = false;

    for (const pattern of transactionPatterns) {
      const matches = text.matchAll(pattern);

      for (const match of matches) {
        matchFound = true;
        const dateStr = match[1];
        const description = match[2]?.trim();

        if (!description || description.length < 3) continue;

        // Skip header rows and summary lines
        const descLower = description.toLowerCase();
        if (descLower.includes('description') ||
            descLower.includes('date') ||
            descLower.includes('transaction') ||
            descLower.includes('beginning balance') ||
            descLower.includes('ending balance') ||
            descLower.includes('total deposits') ||
            descLower.includes('total withdrawals') ||
            descLower.includes('account summary') ||
            descLower.includes('account number') ||
            descLower.includes('page') ||
            descLower.startsWith('continued on')) {
          continue;
        }

        // Clean up OCR artifacts from description (leading symbols)
        let cleanDescription = description.replace(/^[*+\\vA!©1-]\s*/, '').trim();

        // Create context string for debugging date parsing
        const rawContext = match[0].substring(0, 80); // First 80 chars of matched line

        const date = parseDate(dateStr, rawContext);
        if (!date) {
          warnings.push(`Could not parse date: ${dateStr} (raw text: ${rawContext})`);
          console.log(`[Transaction Parse] Failed to parse date "${dateStr}" from line: ${rawContext}`);
          continue;
        }

        let amount: number | null = null;
        let type: 'RECEIPT' | 'DISBURSEMENT' = 'DISBURSEMENT';

        // Check if we have debit/credit columns (match[3] and match[4])
        if (match[4]) {
          // Debit/Credit format
          const debit = parseAmount(match[3]);
          const credit = parseAmount(match[4]);

          if (debit && debit > 0) {
            amount = debit;
            type = 'DISBURSEMENT';
          } else if (credit && credit > 0) {
            amount = credit;
            type = 'RECEIPT';
          }
        } else if (match[3]) {
          // Single amount column
          amount = parseAmount(match[3]);
          if (amount !== null) {
            if (amount < 0) {
              type = 'DISBURSEMENT';
              amount = Math.abs(amount);
            } else {
              type = 'RECEIPT';
            }
          }
        }

        if (amount === null || amount === 0) {
          warnings.push(`Could not parse amount for transaction: ${description}`);
          continue;
        }

        transactions.push({
          date: date.toISOString(),
          description: cleanDescription.replace(/\s+/g, ' ').trim(),
          amount,
          type,
        });
      }

      if (matchFound) break;
    }

    if (transactions.length === 0) {
      errors.push('No transactions found in PDF. The PDF may be scanned or have an unsupported format. Please try converting to CSV or use a text-based PDF.');
      warnings.push('Tip: Many banks allow you to download statements as CSV which are easier to parse.');
    }

    return NextResponse.json({ transactions, errors, warnings });
  } catch (error) {
    console.error('PDF parsing error:', error);
    errors.push(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return NextResponse.json({ transactions, errors, warnings });
  }
}
