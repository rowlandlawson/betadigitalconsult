
import { pool } from './src/config/database.js';

const NEW_ADMIN_EMAIL = 'lawsonrowland.office@gmail.com'; // The one allowed by Resend

async function fixAdminEmail() {
    try {
        console.log(`🔄 Updating Company Admin Email to: ${NEW_ADMIN_EMAIL}...`);

        // Update company settings (Primary source for emails)
        await pool.query(
            'UPDATE company_settings SET email = $1',
            [NEW_ADMIN_EMAIL]
        );
        console.log('✅ Company Settings updated.');

        // Also update the Admin user's email to match, just in case
        await pool.query(
            "UPDATE users SET email = $1 WHERE role = 'admin'",
            [NEW_ADMIN_EMAIL]
        );
        console.log('✅ Admin User Profile updated.');

        console.log('\n🎉 FIXED! You can now test the "Forgot Password" flow.');
        console.log(`Emails will be sent TO: ${NEW_ADMIN_EMAIL}`);
    } catch (error) {
        console.error('❌ Error updating email:', error);
    } finally {
        await pool.end();
    }
}

fixAdminEmail();
