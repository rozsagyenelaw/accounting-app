// Connect to database and get all parsed transactions
const { Pool } = require('pg');

async function getTransactions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const result = await pool.query(`
      SELECT 
        date, 
        description, 
        amount, 
        type,
        category
      FROM transactions 
      ORDER BY date
    `);

    console.log(`\nTotal transactions in database: ${result.rows.length}\n`);
    
    // Separate by source
    const bofaTransactions = result.rows.filter(t => 
      t.description && (
        t.description.includes('CHECKCARD') || 
        t.description.includes('SSA TREAS') ||
        t.description.includes('WIRE TYPE') ||
        /CHECK #?\d+/i.test(t.description)
      )
    );
    
    const logixTransactions = result.rows.filter(t =>
      t.description && t.description.toLowerCase().includes('logix')
    );
    
    console.log(`Bank of America transactions: ${bofaTransactions.length}`);
    console.log(`Logix transactions: ${logixTransactions.length}`);
    console.log(`Other transactions: ${result.rows.length - bofaTransactions.length - logixTransactions.length}`);
    
    // Show first 20 BofA transactions
    console.log('\n\nFirst 20 Bank of America transactions:\n');
    bofaTransactions.slice(0, 20).forEach((t, i) => {
      console.log(`${String(i+1).padStart(3)}. ${t.date} | $${String(t.amount).padStart(10)} | ${t.description.substring(0, 60)}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

getTransactions();
