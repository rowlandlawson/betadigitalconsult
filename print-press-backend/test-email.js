import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

async function testEmail() {
    console.log('🔍 Testing email configuration...\n');

    console.log('Environment variables:');
    console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Set ✓' : 'Missing ✗');
    console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
    console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
    console.log('\n');

    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        console.log('📧 Attempting to send test email...\n');

        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM,
            to: 'delivered@resend.dev', // Resend test email
            subject: 'Test Email from PrintPress Suite',
            html: '<h1>Test Email</h1><p>This is a test email from PrintPress Suite to verify email functionality.</p>',
        });

        if (error) {
            console.error('❌ Resend API Error:');
            console.error(JSON.stringify(error, null, 2));
            return;
        }

        console.log('✅ Email sent successfully!');
        console.log('Email ID:', data.id);
        console.log('\nIf this worked, the issue is likely with the admin email configuration in company_settings.');
    } catch (err) {
        console.error('❌ Error sending email:');
        console.error(err);
    }
}

testEmail();
