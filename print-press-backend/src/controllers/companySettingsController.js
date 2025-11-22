/**
 * COMPANY SETTINGS CONTROLLER - FIXED VERSION
 */

import { pool } from '../config/database.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure upload directory
const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/logos');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Remove any stale logo files from disk, optionally keeping the latest file.
 */
async function cleanupLogoDirectory(fileToKeep = null) {
  try {
    const files = await fs.readdir(UPLOAD_DIR);
    await Promise.all(
      files
        .filter((file) => file !== fileToKeep)
        .map(async (file) => {
          const filePath = path.join(UPLOAD_DIR, file);
          try {
            await fs.unlink(filePath);
            console.log('🧹 Removed stale logo file:', filePath);
          } catch (err) {
            console.warn('⚠️ Could not remove stale logo file:', filePath, err.message);
          }
        })
    );
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('⚠️ Could not inspect logo upload directory:', err.message);
    }
  }
}

/**
 * Get company settings
 * GET /api/company-settings
 */
export const getCompanySettings = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, tagline, address, phone, email, logo FROM company_settings LIMIT 1'
    );

    if (result.rows.length === 0) {
      // Return default settings if none exist
      return res.json({
        name: 'YOUR COMPANY NAME HERE',
        tagline: 'Your Business Tagline',
        address: 'Your Address, City, Country',
        phone: '+234 (0) Your Phone Number',
        email: 'your-email@company.com',
        logo: null
      });
    }

    // Ensure logo field is always present
    const settings = result.rows[0];
    if (!settings.logo) {
      settings.logo = null;
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching company settings:', error);
    res.status(500).json({ 
      error: 'Failed to fetch company settings',
      message: error.message 
    });
  }
};

/**
 * Update company settings
 * PUT /api/company-settings
 */
export const updateCompanySettings = async (req, res) => {
  try {
    const { name, tagline, address, phone, email, logo } = req.body;

    // Validate required fields
    if (!name || !address || !phone || !email) {
      return res.status(400).json({
        error: 'Missing required fields: name, address, phone, email',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
      });
    }

    // Check if settings exist
    const existsResult = await pool.query(
      'SELECT id FROM company_settings LIMIT 1'
    );

    let result;
    if (existsResult.rows.length === 0) {
      // Insert new settings
      result = await pool.query(
        `INSERT INTO company_settings (name, tagline, address, phone, email, logo, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         RETURNING id, name, tagline, address, phone, email, logo`,
        [name, tagline || '', address, phone, email, logo || null]
      );
    } else {
      // Update existing settings
      result = await pool.query(
        `UPDATE company_settings 
         SET name = $1, tagline = $2, address = $3, phone = $4, email = $5, 
             logo = COALESCE($6, logo), updated_at = CURRENT_TIMESTAMP
         WHERE id = (SELECT id FROM company_settings LIMIT 1)
         RETURNING id, name, tagline, address, phone, email, logo`,
        [name, tagline || '', address, phone, email, logo || null]
      );
    }

    const updatedSettings = result.rows[0];

    // Sync admin email and phone with company settings
    try {
      await pool.query(
        `UPDATE users 
         SET email = $1, phone = $2, updated_at = CURRENT_TIMESTAMP
         WHERE role = 'admin' AND is_active = true`,
        [email, phone]
      );
      console.log('✅ Admin email and phone synced with company settings');
    } catch (syncError) {
      console.warn('⚠️ Could not sync admin email/phone:', syncError.message);
      // Continue even if sync fails
    }

    res.json({
      success: true,
      ...updatedSettings,
      message: 'Company settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating company settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update company settings',
      message: error.message,
    });
  }
};

/**
 * Upload company logo - FIXED VERSION
 * POST /api/company-settings/upload-logo
 */
export const uploadLogo = async (req, res) => {
  try {
    console.log('🔄 Starting logo upload process...');
    
    // Ensure upload directory exists
    await ensureUploadDir();
    console.log('✅ Upload directory verified:', UPLOAD_DIR);

    if (!req.file) {
      console.log('❌ No file provided in request');
      return res.status(400).json({ error: 'No file provided' });
    }

    console.log('📄 File received:', {
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Validate file type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimes.includes(req.file.mimetype)) {
      console.log('❌ Invalid file type:', req.file.mimetype);
      return res.status(400).json({
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed',
      });
    }

    // Validate file size
    if (req.file.size > MAX_FILE_SIZE) {
      console.log('❌ File too large:', req.file.size);
      return res.status(400).json({
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(req.file.originalname);
    const filename = `logo_${timestamp}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    
    // Use proper URL path - FIXED: Use /uploads path (not /api/uploads) since static files are served at /uploads
    const logoUrl = `/uploads/logos/${filename}`;

    console.log('📝 Generated file info:', {
      filename,
      filepath,
      logoUrl
    });

    // Get current settings to delete old logo
    const currentSettings = await pool.query(
      'SELECT logo_file_path, logo FROM company_settings LIMIT 1'
    );

    // Delete old logo file if it exists
    if (currentSettings.rows.length > 0 && currentSettings.rows[0].logo_file_path) {
      try {
        const oldFilePath = currentSettings.rows[0].logo_file_path;
        console.log('🗑️ Attempting to delete old logo:', oldFilePath);
        // Check if file exists before trying to delete
        try {
          await fs.access(oldFilePath);
          await fs.unlink(oldFilePath);
          console.log('✅ Old logo deleted successfully');
        } catch (accessErr) {
          console.warn('⚠️ Old logo file does not exist, skipping deletion:', oldFilePath);
        }
      } catch (err) {
        console.warn('⚠️ Could not delete old logo file:', err.message);
        // Continue with upload even if old file deletion fails
      }
    }

    // Save new file to disk
    console.log('💾 Saving new logo to:', filepath);
    await fs.writeFile(filepath, req.file.buffer);
    console.log('✅ Logo saved to disk successfully');
    await cleanupLogoDirectory(filename);

    // Check if settings exist
    const settingsExists = await pool.query(
      'SELECT id FROM company_settings LIMIT 1'
    );

    let result;
    if (settingsExists.rows.length === 0) {
      // If no settings exist, create with logo
      console.log('📝 Creating new company settings with logo');
      result = await pool.query(
        `INSERT INTO company_settings (name, logo, logo_file_path, updated_at)
         VALUES ('YOUR COMPANY NAME HERE', $1, $2, CURRENT_TIMESTAMP)
         RETURNING id, name, logo`,
        [logoUrl, filepath]
      );
    } else {
      // Update existing settings with logo - FIXED: Return all fields
      console.log('📝 Updating existing company settings with logo');
      result = await pool.query(
        `UPDATE company_settings 
         SET logo = $1, logo_file_path = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = (SELECT id FROM company_settings LIMIT 1)
         RETURNING id, name, tagline, address, phone, email, logo`,
        [logoUrl, filepath]
      );
    }

    console.log('✅ Database updated successfully:', result.rows[0]);
    console.log('🌐 Logo accessible at:', `${process.env.FRONTEND_URL || 'http://localhost:3000'}${logoUrl}`);

    // FIXED: Return proper response structure that frontend expects
    res.json({
      success: true,
      logoUrl: logoUrl,
      message: 'Logo uploaded successfully',
    });
  } catch (error) {
    console.error('❌ Logo upload failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload logo',
      message: error.message,
    });
  }
};

/**
 * Delete company logo
 */
export const deleteLogo = async (req, res) => {
  try {
    // Get current logo path
    const result = await pool.query(
      'SELECT logo_file_path FROM company_settings LIMIT 1'
    );

    if (result.rows.length > 0 && result.rows[0].logo_file_path) {
      // Delete file from disk
      try {
        await fs.unlink(result.rows[0].logo_file_path);
        console.log('Deleted logo file from disk');
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }

    await cleanupLogoDirectory();

    // Update database - set logo to NULL
    const updateResult = await pool.query(
      `UPDATE company_settings 
       SET logo = NULL, logo_file_path = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = (SELECT id FROM company_settings LIMIT 1)
       RETURNING id, name, logo`
    );

    res.json({ 
      success: true,
      message: 'Logo deleted successfully',
      data: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete logo',
      message: error.message,
    });
  }
};

export default {
  getCompanySettings,
  updateCompanySettings,
  uploadLogo,
  deleteLogo,
};