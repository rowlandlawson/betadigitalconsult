import crypto from 'crypto';
import { pool } from '../config/database.js';

let schemaReady = false;

const DEFAULT_LANDING_CONTENT = {
  hero_title: 'Print and design support that helps your brand show up well.',
  hero_subtitle:
    'From everyday business materials to campaign-ready print jobs, we help you look polished, prepared, and easy to trust.',
  hero_eyebrow: 'Print support for brands that want to look ready',
  hero_highlight_text: 'The kind of print work that makes people take your brand seriously.',
  hero_panel_title: 'Built for brands that want clean, confident presentation.',
  hero_panel_description:
    'We combine design thinking, quality production, and dependable turnaround so your printed materials feel as professional as your business.',
  about_title: 'About BetaDigital Consult',
  about_description:
    'BetaDigital Consult delivers design and print services for brands, events, and organizations. We focus on quality output and fast turnaround.',
  services_title: 'What We Do',
  services_description:
    'From brand design to large-format printing, we handle complete creative and print production.',
  services_items: [
    'Brand identity design',
    'Brochures, flyers, and company profiles',
    'Large-format banners and signage',
    'Business cards and stationery',
    'Packaging and label production',
    'Event and campaign print materials',
  ],
  navbar_jobs_text: 'Our Jobs',
  navbar_contact_text: 'Contact Us',
  jobs_section_title: 'Our Jobs',
  jobs_section_link_text: 'View All Jobs',
  jobs_loading_text: 'Loading jobs...',
  jobs_empty_text: 'No jobs added yet.',
  contact_section_title: 'Contact',
  cta_title: 'Ready to Start Your Next Project?',
  cta_description:
    'Message us on WhatsApp and let us help you bring your ideas to life.',
  cta_button_text: 'Chat on WhatsApp',
};

const toSlug = (value = '') =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
};

const parseServicesItems = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || '').trim()).filter(Boolean);
      }
    } catch (error) {
      return value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return DEFAULT_LANDING_CONTENT.services_items;
};

const normalizeLandingContentRow = (row = {}) => ({
  ...DEFAULT_LANDING_CONTENT,
  ...row,
  services_items: parseServicesItems(row.services_items),
});

const ensureLandingSchema = async () => {
  if (schemaReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS landing_content (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      hero_title TEXT NOT NULL,
      hero_subtitle TEXT,
      hero_eyebrow TEXT,
      hero_highlight_text TEXT,
      hero_panel_title TEXT,
      hero_panel_description TEXT,
      about_title TEXT,
      about_description TEXT,
      services_title TEXT,
      services_description TEXT,
      services_items TEXT,
      navbar_jobs_text TEXT,
      navbar_contact_text TEXT,
      jobs_section_title TEXT,
      jobs_section_link_text TEXT,
      jobs_loading_text TEXT,
      jobs_empty_text TEXT,
      contact_section_title TEXT,
      cta_title TEXT,
      cta_description TEXT,
      cta_button_text VARCHAR(120) DEFAULT 'Chat on WhatsApp',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    ALTER TABLE landing_content
    ADD COLUMN IF NOT EXISTS hero_eyebrow TEXT;
  `);

  await pool.query(`
    ALTER TABLE landing_content
    ADD COLUMN IF NOT EXISTS hero_highlight_text TEXT;
  `);

  await pool.query(`
    ALTER TABLE landing_content
    ADD COLUMN IF NOT EXISTS hero_panel_title TEXT;
  `);

  await pool.query(`
    ALTER TABLE landing_content
    ADD COLUMN IF NOT EXISTS hero_panel_description TEXT;
  `);

  await pool.query(`
    ALTER TABLE landing_content
    ADD COLUMN IF NOT EXISTS services_items TEXT;
  `);

  await pool.query(`
    ALTER TABLE landing_content
    ADD COLUMN IF NOT EXISTS navbar_jobs_text TEXT;
  `);

  await pool.query(`
    ALTER TABLE landing_content
    ADD COLUMN IF NOT EXISTS navbar_contact_text TEXT;
  `);

  await pool.query(`
    ALTER TABLE landing_content
    ADD COLUMN IF NOT EXISTS jobs_section_title TEXT;
  `);

  await pool.query(`
    ALTER TABLE landing_content
    ADD COLUMN IF NOT EXISTS jobs_section_link_text TEXT;
  `);

  await pool.query(`
    ALTER TABLE landing_content
    ADD COLUMN IF NOT EXISTS jobs_loading_text TEXT;
  `);

  await pool.query(`
    ALTER TABLE landing_content
    ADD COLUMN IF NOT EXISTS jobs_empty_text TEXT;
  `);

  await pool.query(`
    ALTER TABLE landing_content
    ADD COLUMN IF NOT EXISTS contact_section_title TEXT;
  `);

  await pool.query(`
    INSERT INTO landing_content (
      hero_title, hero_subtitle, hero_eyebrow, hero_highlight_text, hero_panel_title, hero_panel_description,
      about_title, about_description, services_title, services_description, services_items, navbar_jobs_text, navbar_contact_text,
      jobs_section_title, jobs_section_link_text, jobs_loading_text, jobs_empty_text, contact_section_title,
      cta_title, cta_description, cta_button_text
    )
    SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
    WHERE NOT EXISTS (SELECT 1 FROM landing_content LIMIT 1);
  `, [
    DEFAULT_LANDING_CONTENT.hero_title,
    DEFAULT_LANDING_CONTENT.hero_subtitle,
    DEFAULT_LANDING_CONTENT.hero_eyebrow,
    DEFAULT_LANDING_CONTENT.hero_highlight_text,
    DEFAULT_LANDING_CONTENT.hero_panel_title,
    DEFAULT_LANDING_CONTENT.hero_panel_description,
    DEFAULT_LANDING_CONTENT.about_title,
    DEFAULT_LANDING_CONTENT.about_description,
    DEFAULT_LANDING_CONTENT.services_title,
    DEFAULT_LANDING_CONTENT.services_description,
    JSON.stringify(DEFAULT_LANDING_CONTENT.services_items),
    DEFAULT_LANDING_CONTENT.navbar_jobs_text,
    DEFAULT_LANDING_CONTENT.navbar_contact_text,
    DEFAULT_LANDING_CONTENT.jobs_section_title,
    DEFAULT_LANDING_CONTENT.jobs_section_link_text,
    DEFAULT_LANDING_CONTENT.jobs_loading_text,
    DEFAULT_LANDING_CONTENT.jobs_empty_text,
    DEFAULT_LANDING_CONTENT.contact_section_title,
    DEFAULT_LANDING_CONTENT.cta_title,
    DEFAULT_LANDING_CONTENT.cta_description,
    DEFAULT_LANDING_CONTENT.cta_button_text,
  ]);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS portfolio_categories (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      slug VARCHAR(140) UNIQUE,
      description TEXT,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    ALTER TABLE portfolio_categories
    ADD COLUMN IF NOT EXISTS slug VARCHAR(140);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS portfolio_items (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      title VARCHAR(180) NOT NULL,
      description TEXT,
      category_id UUID REFERENCES portfolio_categories(id) ON DELETE SET NULL,
      media_type VARCHAR(20) CHECK (media_type IN ('image', 'video')) DEFAULT 'image',
      media_url TEXT NOT NULL,
      is_featured BOOLEAN DEFAULT false,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    ALTER TABLE company_settings
    ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);
  `);

  await pool.query(`
    UPDATE company_settings
    SET whatsapp_number = COALESCE(whatsapp_number, phone)
    WHERE whatsapp_number IS NULL;
  `);

  await pool.query(`
    INSERT INTO portfolio_categories (name, slug, description, display_order)
    VALUES
      ('Design', 'design', 'Brand and visual design projects', 1),
      ('Print', 'print', 'Printed materials and production jobs', 2)
    ON CONFLICT (name) DO NOTHING;
  `);

  schemaReady = true;
};

const getLandingContentRecord = async () => {
  const contentResult = await pool.query(
    `SELECT id, hero_title, hero_subtitle, hero_eyebrow, hero_highlight_text, hero_panel_title, hero_panel_description, about_title, about_description,
            services_title, services_description, services_items, navbar_jobs_text, navbar_contact_text, jobs_section_title, jobs_section_link_text,
            jobs_loading_text, jobs_empty_text, contact_section_title, cta_title, cta_description,
            cta_button_text
     FROM landing_content
     ORDER BY created_at ASC
     LIMIT 1`
  );

  return normalizeLandingContentRow(contentResult.rows[0]);
};

const mapPortfolioRow = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  media_type: row.media_type,
  media_url: row.media_url,
  is_featured: row.is_featured,
  display_order: row.display_order,
  category: {
    id: row.category_id,
    name: row.category_name || 'Uncategorized',
    slug: row.category_slug || 'uncategorized',
  },
  created_at: row.created_at,
});

export const getPublicLandingData = async (req, res) => {
  try {
    await ensureLandingSchema();

    const [content, companyResult, featuredResult] = await Promise.all([
      getLandingContentRecord(),
      pool.query(
        `SELECT name, tagline, address, phone, email, logo, whatsapp_number
         FROM company_settings
         LIMIT 1`
      ),
      pool.query(
        `SELECT pi.id, pi.title, pi.description, pi.media_type, pi.media_url,
                pi.is_featured, pi.display_order, pi.created_at, pi.category_id,
                pc.name AS category_name, pc.slug AS category_slug
         FROM portfolio_items pi
         LEFT JOIN portfolio_categories pc ON pc.id = pi.category_id
         ORDER BY pi.created_at DESC
         LIMIT 3`
      ),
    ]);

    const company = companyResult.rows[0] || {};
    const whatsappNumber = company.whatsapp_number || company.phone || '';

    res.json({
      content,
      contact: {
        company_name: company.name || 'BetaDigital Consult',
        tagline: company.tagline || '',
        email: company.email || '',
        address: company.address || '',
        phone: company.phone || '',
        whatsapp_number: whatsappNumber,
        logo: company.logo || null,
      },
      featured_portfolio: featuredResult.rows.map(mapPortfolioRow),
    });
  } catch (error) {
    console.error('Error fetching public landing data:', error);
    res.status(500).json({ error: 'Failed to fetch landing data' });
  }
};

export const getPublicPortfolio = async (req, res) => {
  try {
    await ensureLandingSchema();

    const categoriesResult = await pool.query(
      `SELECT id, name, slug, description, display_order
       FROM portfolio_categories
       ORDER BY display_order ASC, name ASC`
    );

    const itemsResult = await pool.query(
      `SELECT pi.id, pi.title, pi.description, pi.media_type, pi.media_url,
              pi.is_featured, pi.display_order, pi.created_at, pi.category_id,
              pc.name AS category_name, pc.slug AS category_slug
       FROM portfolio_items pi
       LEFT JOIN portfolio_categories pc ON pc.id = pi.category_id
       ORDER BY pi.display_order ASC, pi.created_at DESC`
    );

    const items = itemsResult.rows.map(mapPortfolioRow);
    const grouped = categoriesResult.rows.map((category) => ({
      ...category,
      items: items.filter((item) => item.category.id === category.id),
    }));

    const uncategorized = items.filter((item) => !item.category.id);
    if (uncategorized.length > 0) {
      grouped.push({
        id: 'uncategorized',
        name: 'Uncategorized',
        slug: 'uncategorized',
        description: '',
        display_order: 999,
        items: uncategorized,
      });
    }

    res.json({ categories: grouped, items });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
};

export const getAdminWebsiteData = async (req, res) => {
  try {
    await ensureLandingSchema();

    const [content, categories, items] = await Promise.all([
      getLandingContentRecord(),
      pool.query(
        `SELECT id, name, slug, description, display_order, created_at
         FROM portfolio_categories
         ORDER BY display_order ASC, name ASC`
      ),
      pool.query(
        `SELECT pi.id, pi.title, pi.description, pi.media_type, pi.media_url,
                pi.is_featured, pi.display_order, pi.category_id, pi.created_at,
                pc.name AS category_name, pc.slug AS category_slug
         FROM portfolio_items pi
         LEFT JOIN portfolio_categories pc ON pc.id = pi.category_id
         ORDER BY pi.display_order ASC, pi.created_at DESC`
      ),
    ]);

    res.json({
      content,
      categories: categories.rows,
      items: items.rows.map(mapPortfolioRow),
    });
  } catch (error) {
    console.error('Error fetching admin website data:', error);
    res.status(500).json({ error: 'Failed to fetch website data' });
  }
};

export const updateLandingContent = async (req, res) => {
  try {
    await ensureLandingSchema();
    const payload = normalizeLandingContentRow({ ...DEFAULT_LANDING_CONTENT, ...req.body });

    const result = await pool.query(
      `UPDATE landing_content
       SET hero_title = $1,
           hero_subtitle = $2,
           hero_eyebrow = $3,
           hero_highlight_text = $4,
           hero_panel_title = $5,
           hero_panel_description = $6,
           about_title = $7,
           about_description = $8,
           services_title = $9,
           services_description = $10,
           services_items = $11,
           navbar_jobs_text = $12,
           navbar_contact_text = $13,
           jobs_section_title = $14,
           jobs_section_link_text = $15,
           jobs_loading_text = $16,
           jobs_empty_text = $17,
           contact_section_title = $18,
           cta_title = $19,
           cta_description = $20,
           cta_button_text = $21,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = (SELECT id FROM landing_content ORDER BY created_at ASC LIMIT 1)
       RETURNING id, hero_title, hero_subtitle, hero_eyebrow, hero_highlight_text, hero_panel_title, hero_panel_description, about_title, about_description,
                 services_title, services_description, services_items, navbar_jobs_text, navbar_contact_text, jobs_section_title, jobs_section_link_text,
                 jobs_loading_text, jobs_empty_text, contact_section_title, cta_title, cta_description, cta_button_text`
    , [
      payload.hero_title,
      payload.hero_subtitle,
      payload.hero_eyebrow,
      payload.hero_highlight_text,
      payload.hero_panel_title,
      payload.hero_panel_description,
      payload.about_title,
      payload.about_description,
      payload.services_title,
      payload.services_description,
      JSON.stringify(payload.services_items),
      payload.navbar_jobs_text,
      payload.navbar_contact_text,
      payload.jobs_section_title,
      payload.jobs_section_link_text,
      payload.jobs_loading_text,
      payload.jobs_empty_text,
      payload.contact_section_title,
      payload.cta_title,
      payload.cta_description,
      payload.cta_button_text,
    ]);

    res.json({
      message: 'Landing content updated successfully',
      content: normalizeLandingContentRow(result.rows[0]),
    });
  } catch (error) {
    console.error('Error updating landing content:', error);
    res.status(500).json({ error: 'Failed to update landing content' });
  }
};

export const uploadLandingMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({
        error: 'Cloud media upload is not configured. Add Cloudinary credentials to the backend environment.',
      });
    }

    const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'betadigitalconsult/our-jobs';
    const signatureBase = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(signatureBase).digest('hex');

    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer]), req.file.originalname);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);
    formData.append('folder', folder);

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${mediaType}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const uploadResult = await uploadResponse.json();

    if (!uploadResponse.ok || !uploadResult.secure_url) {
      return res.status(502).json({
        error: uploadResult?.error?.message || 'Cloud media upload failed',
      });
    }

    res.json({
      message: 'Media uploaded successfully',
      media_url: uploadResult.secure_url,
      media_type: mediaType,
    });
  } catch (error) {
    console.error('Error uploading landing media:', error);
    res.status(500).json({ error: 'Failed to upload media' });
  }
};

export const createCategory = async (req, res) => {
  try {
    await ensureLandingSchema();
    const { name, description = '', display_order = 0 } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const slug = toSlug(name);
    const result = await pool.query(
      `INSERT INTO portfolio_categories (name, slug, description, display_order, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING id, name, slug, description, display_order, created_at`,
      [name.trim(), slug, description, Number(display_order) || 0]
    );

    res.status(201).json({
      message: 'Category created successfully',
      category: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

export const updateCategory = async (req, res) => {
  try {
    await ensureLandingSchema();
    const { id } = req.params;
    const { name, description = '', display_order = 0 } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const slug = toSlug(name);
    const result = await pool.query(
      `UPDATE portfolio_categories
       SET name = $1,
           slug = $2,
           description = $3,
           display_order = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, name, slug, description, display_order, created_at`,
      [name.trim(), slug, description, Number(display_order) || 0, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({
      message: 'Category updated successfully',
      category: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    await ensureLandingSchema();
    const { id } = req.params;

    await pool.query(
      `UPDATE portfolio_items
       SET category_id = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE category_id = $1`,
      [id]
    );

    const result = await pool.query(
      'DELETE FROM portfolio_categories WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

export const createPortfolioItem = async (req, res) => {
  try {
    await ensureLandingSchema();
    const {
      title,
      description = '',
      media_type = 'image',
      media_url,
      is_featured = false,
      display_order = 0,
      category_id = null,
    } = req.body;

    if (!title?.trim() || !media_url?.trim()) {
      return res.status(400).json({ error: 'Title and media URL are required' });
    }

    const result = await pool.query(
      `INSERT INTO portfolio_items
       (title, description, media_type, media_url, is_featured, display_order, category_id, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING id, title, description, media_type, media_url, is_featured,
                 display_order, category_id, created_at`,
      [
        title.trim(),
        description,
        media_type === 'video' ? 'video' : 'image',
        media_url.trim(),
        parseBoolean(is_featured, false),
        Number(display_order) || 0,
        category_id || null,
      ]
    );

    res.status(201).json({
      message: 'Portfolio item created successfully',
      item: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating portfolio item:', error);
    res.status(500).json({ error: 'Failed to create portfolio item' });
  }
};

export const updatePortfolioItem = async (req, res) => {
  try {
    await ensureLandingSchema();
    const { id } = req.params;
    const {
      title,
      description = '',
      media_type = 'image',
      media_url,
      is_featured = false,
      display_order = 0,
      category_id = null,
    } = req.body;

    if (!title?.trim() || !media_url?.trim()) {
      return res.status(400).json({ error: 'Title and media URL are required' });
    }

    const result = await pool.query(
      `UPDATE portfolio_items
       SET title = $1,
           description = $2,
           media_type = $3,
           media_url = $4,
           is_featured = $5,
           display_order = $6,
           category_id = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING id, title, description, media_type, media_url, is_featured,
                 display_order, category_id, created_at`,
      [
        title.trim(),
        description,
        media_type === 'video' ? 'video' : 'image',
        media_url.trim(),
        parseBoolean(is_featured, false),
        Number(display_order) || 0,
        category_id || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio item not found' });
    }

    res.json({
      message: 'Portfolio item updated successfully',
      item: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating portfolio item:', error);
    res.status(500).json({ error: 'Failed to update portfolio item' });
  }
};

export const deletePortfolioItem = async (req, res) => {
  try {
    await ensureLandingSchema();
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM portfolio_items WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio item not found' });
    }

    res.json({ message: 'Portfolio item deleted successfully' });
  } catch (error) {
    console.error('Error deleting portfolio item:', error);
    res.status(500).json({ error: 'Failed to delete portfolio item' });
  }
};
