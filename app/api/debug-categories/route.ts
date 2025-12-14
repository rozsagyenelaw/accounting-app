import { NextResponse } from 'next/server';

// This endpoint helps debug transaction categorization
// Call it after uploading transactions to see how they were categorized

export async function POST(request: Request) {
  try {
    const { transactions } = await request.json();

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json({ error: 'Invalid request. Send { transactions: [...] }' }, { status: 400 });
    }

    // Group transactions by category
    const byCategory: Record<string, any[]> = {};
    const byCategoryTotals: Record<string, number> = {};

    for (const txn of transactions) {
      const cat = txn.category || 'UNCATEGORIZED';

      if (!byCategory[cat]) {
        byCategory[cat] = [];
        byCategoryTotals[cat] = 0;
      }

      byCategory[cat].push({
        date: txn.date,
        description: txn.description,
        amount: txn.amount,
        type: txn.type,
      });

      byCategoryTotals[cat] += txn.amount;
    }

    // Sort categories by total amount (descending)
    const sortedCategories = Object.entries(byCategoryTotals)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, total]) => ({
        category: cat,
        total: Math.round(total * 100) / 100,
        count: byCategory[cat].length,
        transactions: byCategory[cat].sort((a, b) => b.amount - a.amount), // Sort by amount desc
      }));

    return NextResponse.json({
      summary: sortedCategories,
      totalTransactions: transactions.length,
    });
  } catch (error) {
    console.error('Debug categories error:', error);
    return NextResponse.json({ error: 'Failed to debug categories' }, { status: 500 });
  }
}
