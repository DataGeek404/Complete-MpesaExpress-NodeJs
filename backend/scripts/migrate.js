const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function migrate() {
  console.log('🚀 Starting database migration...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    const sqlPath = path.join(__dirname, '..', 'migrations', 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Executing migration script...\n');
    await connection.query(sql);

    console.log('✅ Migration completed successfully!\n');
    console.log('Tables created:');
    console.log('  - transactions');
    console.log('  - logs');
    console.log('  - error_events');
    console.log('  - token_cache');
    console.log('  - callback_history');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
