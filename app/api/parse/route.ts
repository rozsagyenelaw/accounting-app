import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { parse, isValid } from 'date-fns';

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
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      return await parseCSV(file);
    } else if (fileName.endsWith('.pdf')) {
      return NextResponse.json({
        transactions: [],
        errors: ['PDF parsing is not yet fully implemented. Please use CSV format for best results.'],
        warnings: [],
      });
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload CSV or PDF files.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
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
