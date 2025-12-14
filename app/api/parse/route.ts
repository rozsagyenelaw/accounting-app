import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { parse, isValid } from 'date-fns';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { extractTextFromScannedPDF, isScannedPDF } from '@/lib/ocr';
import { parseBankStatements, validateResults } from '@/lib/bank-statement-parser-fixed';
import { categorizeTransaction } from '@/lib/gc400-categories';
import { parseWithAzure, parseExcelFile } from '@/lib/azure-document-parser';

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

  // OCR Fix: Handle years like "0023" -> "2023"
  // Match dates with years starting with "00"
  trimmed = trimmed.replace(/\/00(\d{2})$/, '/20$1');  // MM/DD/0023 -> MM/DD/2023
  trimmed = trimmed.replace(/-00(\d{2})$/, '-20$1');    // MM-DD-0023 -> MM-DD-2023

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
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return await parseExcelFileRoute(file);
    } else if (fileName.endsWith('.pdf')) {
      return await parsePDF(file);
    } else {
      return NextResponse.json({
        transactions: [],
        errors: ['Unsupported file type. Please upload CSV, XLSX, or PDF files.'],
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

          // Categorize the transaction
          const category = categorizeTransaction(description, type);

          transactions.push({
            date: date.toISOString(),
            description,
            amount,
            type,
            category: category.code,
            subCategory: category.subCategory,
            confidence: category.confidence,
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

async function parseExcelFileRoute(file: File): Promise<NextResponse> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const transactions: any[] = [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('[Excel Parser] Parsing Excel file...');

    const result = await parseExcelFile(buffer);

    warnings.push(...result.warnings);

    // Convert format to API format
    for (const txn of result.transactions) {
      transactions.push({
        date: new Date(txn.date).toISOString(),
        description: txn.description,
        amount: txn.amount,
        type: txn.type,
        category: txn.category,
        subCategory: null,
        confidence: txn.confidence,
      });
    }

    console.log(`[Excel Parser] Successfully extracted ${transactions.length} transactions`);
    console.log(`[Excel Parser] Total Receipts: $${result.totalReceipts.toFixed(2)}`);
    console.log(`[Excel Parser] Total Disbursements: $${result.totalDisbursements.toFixed(2)}`);

    if (transactions.length === 0) {
      errors.push('No transactions found in Excel file.');
      errors.push('This may indicate: (1) Unsupported format, (2) Missing headers, or (3) Empty file');
    }

    return NextResponse.json({ transactions, errors, warnings });
  } catch (error) {
    console.error('[Excel Parser] Error:', error);
    errors.push(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return NextResponse.json({ transactions, errors, warnings }, { status: 500 });
  }
}

async function parsePDF(file: File): Promise<NextResponse> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const transactions: any[] = [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Try Azure Document Intelligence first
    const useAzure = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT &&
                     process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

    if (useAzure) {
      console.log('[PDF Parser] Using Azure Document Intelligence for table extraction...');

      try {
        const result = await parseWithAzure(buffer);

        warnings.push(...result.warnings);

        // Convert Azure format to API format
        for (const txn of result.transactions) {
          transactions.push({
            date: new Date(txn.date).toISOString(),
            description: txn.description,
            amount: txn.amount,
            type: txn.type,
            category: txn.category,
            subCategory: null,
            confidence: txn.confidence,
          });
        }

        console.log(`[Azure Parser] Successfully extracted ${transactions.length} transactions`);
        console.log(`[Azure Parser] Total Receipts: $${result.totalReceipts.toFixed(2)}`);
        console.log(`[Azure Parser] Total Disbursements: $${result.totalDisbursements.toFixed(2)}`);

        if (transactions.length === 0) {
          errors.push('Azure Document Intelligence found no transactions in the PDF.');
          errors.push('This may indicate: (1) Unsupported statement format, (2) Low quality scan, or (3) Invalid PDF structure');
          warnings.push('Tip: Try uploading as XLSX/Excel format if your bank provides it.');
        }

        return NextResponse.json({ transactions, errors, warnings });
      } catch (azureError) {
        console.error('[Azure Parser] Error:', azureError);
        const azureErrorMsg = azureError instanceof Error ? azureError.message : 'Unknown error';

        // If Azure fails, fall back to legacy OCR parser
        console.log('[Azure Parser] Failed, falling back to legacy OCR parser...');
        warnings.push(`Azure parsing failed: ${azureErrorMsg}. Attempting legacy OCR parser...`);
      }
    }

    // FALLBACK: Use legacy OCR parser if Azure is not configured or failed
    console.log('[PDF Parser] Using legacy OCR parser (fallback)...');

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

    // Use FIXED parser matching exact BofA OCR format
    console.log('[PDF Parser] Using FIXED parser with exact BofA regex pattern...');
    console.log(`[PDF Parser] Text length: ${text.length} characters`);

    const parsedTransactions = parseBankStatements(text);
    console.log(`[PDF Parser] Parsed ${parsedTransactions.length} transactions`);

    // Validate results
    const validationWarnings = validateResults(parsedTransactions);
    warnings.push(...validationWarnings);

    // Convert to API format and categorize
    for (const txn of parsedTransactions) {
      const category = categorizeTransaction(txn.description, txn.type);

      transactions.push({
        date: txn.date.toISOString(),
        description: txn.description,
        amount: txn.amount,
        type: txn.type,
        category: category.code,
        subCategory: category.subCategory,
        confidence: category.confidence,
      });
    }

    if (transactions.length === 0) {
      errors.push('No transactions found in PDF.');
      errors.push('This may indicate: (1) Unsupported bank statement format, (2) OCR errors, or (3) Invalid PDF structure');
      warnings.push('Supported formats: Bank of America statements');
      warnings.push('Tip: Many banks allow you to download statements as CSV which are easier to parse.');
    } else {
      console.log(`[PDF Parser] Successfully categorized ${transactions.length} transactions`);
    }

    return NextResponse.json({ transactions, errors, warnings });
  } catch (error) {
    console.error('PDF parsing error:', error);
    errors.push(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return NextResponse.json({ transactions, errors, warnings });
  }
}
