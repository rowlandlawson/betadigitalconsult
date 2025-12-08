import { pool } from './src/config/database.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const runMigration = async () => {
  const migrationFilePath = path.join(
    process.cwd(),
    'database',
    'migrations',
    '002_generic_inventory_schema.sql'
  );

  if (!fs.existsSync(migrationFilePath)) {
    console.error(`❌ Migration file not found at: ${migrationFilePath}`);
    return;
  }

  const migrationSQL = fs.readFileSync(migrationFilePath, 'utf-8');

  const client = await pool.connect();

  try {
    console.log('🚀 Starting migration...');

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      try {
        await client.query(stmt);
      } catch (err) {
        // Skip duplicate column errors
        if (err.code === '42701') {
          console.warn(`⚠️ Skipping duplicate column: ${err.message}`);
          continue;
        }

        // Skip "table already exists" errors
        if (err.code === '42P07') {
          console.warn(`⚠️ Skipping duplicate table: ${err.message}`);
          continue;
        }

        // Skip "relation already exists" errors (indexes, constraints)
        if (err.code === '42710') {
          console.warn(`⚠️ Skipping duplicate constraint/index: ${err.message}`);
          continue;
        }

        // Throw all other errors
        throw err;
      }
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    client.release();
    pool.end();
  }
};

runMigration();
