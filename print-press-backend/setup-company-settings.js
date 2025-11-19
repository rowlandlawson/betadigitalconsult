#!/usr/bin/env node
/**
 * Quick Company Settings Table Setup
 * Run this to ensure the company_settings table exists
 */

import { pool } from './src/config/database.js';

async function setupCompanySettings() {
  try {
    console.log('🔍 Checking company_settings table...');

    // Create table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS company_settings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL DEFAULT 'YOUR COMPANY NAME HERE',
        tagline VARCHAR(255) DEFAULT 'Your Business Tagline',
        address TEXT DEFAULT 'Your Address, City, Country',
        phone VARCHAR(50) DEFAULT '+234 (0) Your Phone Number',
        email VARCHAR(255) DEFAULT 'your-email@company.com',
        logo VARCHAR(500),
        logo_file_path VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ company_settings table exists');

    // Check if any data exists
    const checkResult = await pool.query('SELECT COUNT(*) FROM company_settings');
    const count = parseInt(checkResult.rows[0].count);

    if (count === 0) {
      console.log('📝 Inserting default company settings...');
      await pool.query(`
        INSERT INTO company_settings (name, tagline, address, phone, email)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'YOUR COMPANY NAME HERE',
        'Your Business Tagline',
        'Your Address, City, Country',
        '+234 (0) Your Phone Number',
        'your-email@company.com'
      ]);
      console.log('✅ Default settings inserted');
    } else {
      console.log(`✅ Company settings already exist (${count} record(s))`);
    }

    // Display current settings
    const result = await pool.query('SELECT * FROM company_settings LIMIT 1');
    console.log('\n📋 Current settings:');
    console.log(JSON.stringify(result.rows[0], null, 2));

    console.log('\n✅ Company settings setup complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

setupCompanySettings();
