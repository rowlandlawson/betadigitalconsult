import { pool } from './src/config/database.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigration = async () => {
    const migrationFilePath = path.join(
        __dirname,
        'database',
        'migrations',
        '003_add_salary_payments.sql'
    );

    if (!fs.existsSync(migrationFilePath)) {
        console.error(`❌ Migration file not found at: ${migrationFilePath}`);
        return;
    }

    const migrationSQL = fs.readFileSync(migrationFilePath, 'utf-8');

    const client = await pool.connect();

    try {
        console.log('🚀 Starting migration 003...');

        // Split SQL into individual statements
        const statements = migrationSQL
            .split(';')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

        for (const stmt of statements) {
            try {
                await client.query(stmt);
            } catch (err) {
                // Skip "table already exists" errors
                if (err.code === '42P07') {
                    console.warn(`⚠️ Skipping duplicate table: ${err.message}`);
                    continue;
                }
                throw err;
            }
        }

        console.log('✅ Migration 003 completed successfully!');
    } catch (error) {
        console.error('❌ Error during migration:', error);
    } finally {
        client.release();
        pool.end();
    }
};

runMigration();
