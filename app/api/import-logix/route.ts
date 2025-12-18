import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { categorizeTransaction } from '@/lib/gc400-categories';

interface LogixDividend {
  date: string;
  dateDisplay: string;
  amount: number;
  description: string;
}

// POST - Import Logix dividends from JSON file
export async function POST() {
  try {
    const filePath = path.join(process.cwd(), 'logix-dividends-from-statements.json');

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Logix dividends file not found. Please ensure logix-dividends-from-statements.json exists.' },
        { status: 404 }
      );
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const dividends: LogixDividend[] = JSON.parse(fileContent);

    if (!Array.isArray(dividends) || dividends.length === 0) {
      return NextResponse.json(
        { error: 'No dividends found in the Logix file' },
        { status: 400 }
      );
    }

    // Convert to transaction format
    const transactions = dividends.map((div, index) => {
      const category = categorizeTransaction(div.description, 'RECEIPT');

      return {
        id: `logix-dividend-${div.date}-${index}`,
        date: new Date(div.date).toISOString(),
        description: div.description,
        amount: div.amount,
        type: 'RECEIPT' as const,
        category: category.code,
        subCategory: category.subCategory || 'Interest/Dividends',
        confidence: 1.0, // High confidence - manually verified data
        source: 'logix-import',
      };
    });

    // Calculate totals
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

    console.log(`[Logix Import] Imported ${transactions.length} Logix dividends`);
    console.log(`[Logix Import] Total: $${totalAmount.toFixed(2)}`);

    return NextResponse.json({
      success: true,
      transactions,
      summary: {
        count: transactions.length,
        total: totalAmount,
        dateRange: {
          start: dividends[0]?.date,
          end: dividends[dividends.length - 1]?.date,
        }
      }
    });
  } catch (error) {
    console.error('[Logix Import] Error:', error);
    return NextResponse.json(
      { error: `Failed to import Logix dividends: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// GET - Preview Logix dividends without importing
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'logix-dividends-from-statements.json');

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Logix dividends file not found' },
        { status: 404 }
      );
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const dividends: LogixDividend[] = JSON.parse(fileContent);

    const totalAmount = dividends.reduce((sum, d) => sum + d.amount, 0);

    return NextResponse.json({
      dividends,
      summary: {
        count: dividends.length,
        total: totalAmount,
        dateRange: {
          start: dividends[0]?.date,
          end: dividends[dividends.length - 1]?.date,
        }
      }
    });
  } catch (error) {
    console.error('[Logix Import] Error:', error);
    return NextResponse.json(
      { error: `Failed to read Logix dividends: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
