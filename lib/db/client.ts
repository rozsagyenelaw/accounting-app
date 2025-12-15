import { Pool } from 'pg';

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }
  return pool;
}

export async function initializeDatabase() {
  const pool = getDbPool();

  // Create transactions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date TIMESTAMP NOT NULL,
      description TEXT NOT NULL,
      amount NUMERIC(10, 2) NOT NULL,
      type TEXT NOT NULL,
      category TEXT,
      sub_category TEXT,
      check_number TEXT,
      confidence INTEGER,
      manually_reviewed BOOLEAN DEFAULT FALSE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  console.log('[DB] Database initialized');
}
