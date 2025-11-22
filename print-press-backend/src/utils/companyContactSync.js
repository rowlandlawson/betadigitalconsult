import { pool } from '../config/database.js';

const DEFAULT_NAME = 'YOUR COMPANY NAME HERE';
const DEFAULT_TAGLINE = 'Your Business Tagline';
const DEFAULT_ADDRESS = 'Your Address, City, Country';
const DEFAULT_PHONE = '+234 (0) Your Phone Number';
const DEFAULT_EMAIL = 'your-email@company.com';

export async function syncCompanyContactInfo({ email, phone }) {
  const emailProvided = typeof email !== 'undefined';
  const phoneProvided = typeof phone !== 'undefined';

  if (!emailProvided && !phoneProvided) {
    return;
  }

  const normalizedPhone = phoneProvided ? phone : null;
  const normalizedEmail = emailProvided ? email : null;

  try {
    const updateResult = await pool.query(
      `UPDATE company_settings 
       SET 
         phone = COALESCE($1, phone),
         email = COALESCE($2, email),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = (SELECT id FROM company_settings LIMIT 1)`,
      [normalizedPhone, normalizedEmail]
    );

    if (updateResult.rowCount === 0) {
      await pool.query(
        `INSERT INTO company_settings (name, tagline, address, phone, email, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [
          DEFAULT_NAME,
          DEFAULT_TAGLINE,
          DEFAULT_ADDRESS,
          normalizedPhone ?? DEFAULT_PHONE,
          normalizedEmail ?? DEFAULT_EMAIL
        ]
      );
    }
  } catch (error) {
    console.warn('⚠️ Failed to sync company contact info:', error.message);
  }
}

