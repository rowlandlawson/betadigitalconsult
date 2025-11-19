import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createAdminUser() {
  try {
    console.log('Ì¥ß Creating admin user...');
    
    // Check if admin user already exists
    const checkResult = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR user_name = $1',
      ['admin@printpress.com']
    );

    if (checkResult.rows.length > 0) {
      console.log('‚ö†Ô∏è Admin user already exists. Updating...');
      
      // Update existing admin user
      const hashedPassword = await bcrypt.hash('admin!123', 12);
      await pool.query(
        `UPDATE users SET 
         password_hash = $1, 
         user_name = 'admin',
         name = 'System Administrator',
         role = 'admin',
         is_active = true,
         updated_at = CURRENT_TIMESTAMP
         WHERE email = 'admin@printpress.com'`,
        [hashedPassword]
      );
      console.log('‚úÖ Admin user updated successfully!');
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash('admin!123', 12);
      await pool.query(
        `INSERT INTO users (email, name, user_name, password_hash, role, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['admin@printpress.com', 'System Administrator', 'admin', hashedPassword, 'admin', true]
      );
      console.log('‚úÖ Admin user created successfully!');
    }

    // Verify the admin user
    const verifyResult = await pool.query(
      'SELECT id, email, user_name, name, role, is_active FROM users WHERE email = $1',
      ['admin@printpress.com']
    );

    console.log('Ì≥ã Admin user details:');
    console.log(verifyResult.rows[0]);

    console.log('\nÌæØ Login Credentials:');
    console.log('Username: admin');
    console.log('Email: admin@printpress.com');
    console.log('Password: admin!123');

  } catch (error) {
    console.error('‚ùå Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

createAdminUser();
