import { NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db/client';
import type { Transaction } from '@/types';

// GET all transactions
export async function GET() {
  try {
    const pool = getDbPool();
    const result = await pool.query(`
      SELECT
        id,
        date,
        description,
        amount,
        type,
        category,
        sub_category as "subCategory",
        check_number as "checkNumber",
        confidence,
        manually_reviewed as "manuallyReviewed",
        notes
      FROM transactions
      ORDER BY date ASC
    `);

    return NextResponse.json({ transactions: result.rows });
  } catch (error) {
    console.error('[API] Failed to fetch transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

// POST - Save all transactions (replace)
export async function POST(request: Request) {
  try {
    const { transactions } = await request.json();

    if (!Array.isArray(transactions)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const pool = getDbPool();

    // Start transaction
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Clear existing transactions
      await client.query('DELETE FROM transactions');

      // Insert all transactions
      for (const txn of transactions) {
        await client.query(`
          INSERT INTO transactions (
            id, date, description, amount, type, category,
            sub_category, check_number, confidence, manually_reviewed, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          txn.id,
          txn.date,
          txn.description,
          txn.amount,
          txn.type,
          txn.category || null,
          txn.subCategory || null,
          txn.checkNumber || null,
          txn.confidence || null,
          txn.manuallyReviewed || false,
          txn.notes || null,
        ]);
      }

      await client.query('COMMIT');

      console.log(`[API] Saved ${transactions.length} transactions to database`);

      return NextResponse.json({
        success: true,
        count: transactions.length
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[API] Failed to save transactions:', error);
    return NextResponse.json(
      { error: 'Failed to save transactions' },
      { status: 500 }
    );
  }
}

// PUT - Update single transaction
export async function PUT(request: Request) {
  try {
    const transaction: Transaction = await request.json();

    const pool = getDbPool();

    await pool.query(`
      INSERT INTO transactions (
        id, date, description, amount, type, category,
        sub_category, check_number, confidence, manually_reviewed, notes,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (id) DO UPDATE SET
        date = EXCLUDED.date,
        description = EXCLUDED.description,
        amount = EXCLUDED.amount,
        type = EXCLUDED.type,
        category = EXCLUDED.category,
        sub_category = EXCLUDED.sub_category,
        check_number = EXCLUDED.check_number,
        confidence = EXCLUDED.confidence,
        manually_reviewed = EXCLUDED.manually_reviewed,
        notes = EXCLUDED.notes,
        updated_at = NOW()
    `, [
      transaction.id,
      transaction.date,
      transaction.description,
      transaction.amount,
      transaction.type,
      transaction.category || null,
      transaction.subCategory || null,
      transaction.checkNumber || null,
      transaction.confidence || null,
      transaction.manuallyReviewed || false,
      transaction.notes || null,
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Failed to update transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

// DELETE - Delete single transaction
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID required' },
        { status: 400 }
      );
    }

    const pool = getDbPool();
    await pool.query('DELETE FROM transactions WHERE id = $1', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Failed to delete transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
