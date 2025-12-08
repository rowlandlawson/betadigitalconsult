import { pool } from './src/config/database.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const runMigration = async () => {
  const migrationFilePath = path.join(process.cwd(), 'database', 'migrations', '001_add_sheets_tracking.sql');
  
  if (!fs.existsSync(migrationFilePath)) {
    console.error(`❌ Migration file not found at: ${migrationFilePath}`);
    return;
  }

  const migrationSQL = fs.readFileSync(migrationFilePath, 'utf-8');

  const client = await pool.connect();

  try {
    console.log('🚀 Starting migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    client.release();
    pool.end();
  }
};

runMigration();