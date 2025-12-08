-- /print-press-backend/database/migrations/001_add_sheets_tracking.sql
-- Run this in your database BEFORE updating the code

START TRANSACTION;

-- 1. Add new columns
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS current_stock_sheets INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sheets_per_unit INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS threshold_sheets INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS cost_per_sheet DECIMAL(15,3);

-- 2. Set default sheets_per_unit based on unit_of_measure
UPDATE inventory 
SET sheets_per_unit = CASE 
  WHEN LOWER(unit_of_measure) LIKE '%ream%' THEN 500
  WHEN LOWER(unit_of_measure) LIKE '%packet%' THEN 300
  WHEN LOWER(unit_of_measure) LIKE '%bundle%' THEN 250
  WHEN LOWER(unit_of_measure) LIKE '%sheet%' THEN 1
  ELSE 1
END
WHERE sheets_per_unit IS NULL;

-- 3. Migrate current_stock to current_stock_sheets
UPDATE inventory 
SET current_stock_sheets = ROUND(
  COALESCE(current_stock, 0) * COALESCE(sheets_per_unit, 1)
)
WHERE current_stock_sheets IS NULL OR current_stock_sheets = 0;

-- 4. Migrate threshold to threshold_sheets
UPDATE inventory 
SET threshold_sheets = ROUND(
  COALESCE(threshold, 0) * COALESCE(sheets_per_unit, 1)
)
WHERE threshold_sheets IS NULL OR threshold_sheets = 0;

-- 5. Calculate cost_per_sheet
UPDATE inventory 
SET cost_per_sheet = unit_cost / NULLIF(sheets_per_unit, 0)
WHERE cost_per_sheet IS NULL;

-- 6. Add columns to materials_used for sheet tracking
ALTER TABLE materials_used 
ADD COLUMN IF NOT EXISTS quantity_sheets INTEGER,
ADD COLUMN IF NOT EXISTS sheets_converted BOOLEAN DEFAULT false;

-- 7. Add columns to material_usage
ALTER TABLE material_usage 
ADD COLUMN IF NOT EXISTS quantity_sheets INTEGER;

-- 8. Add columns to material_waste
ALTER TABLE material_waste 
ADD COLUMN IF NOT EXISTS quantity_sheets INTEGER;

-- 9. Create a view for backward compatibility
CREATE OR REPLACE VIEW inventory_view AS
SELECT 
  *,
  current_stock_sheets / NULLIF(sheets_per_unit, 1) as current_stock_units,
  threshold_sheets / NULLIF(sheets_per_unit, 1) as threshold_units
FROM inventory;

-- 10. Insert sample data for testing (optional)
INSERT INTO inventory (
  material_name, category, unit_of_measure, sheets_per_unit,
  current_stock_sheets, threshold_sheets, unit_cost, cost_per_sheet
) VALUES 
  ('A4 Paper 80gsm', 'paper', 'ream', 500, 1600, 250, 1500, 3.00),
  ('Bond Paper 120gsm', 'paper', 'packet', 300, 900, 150, 1200, 4.00),
  ('Glossy Paper A3', 'paper', 'sheet', 1, 500, 100, 10, 10.00)
ON CONFLICT DO NOTHING;

COMMIT;

-- Verify the migration
SELECT 
  material_name,
  unit_of_measure,
  sheets_per_unit,
  current_stock_sheets,
  threshold_sheets,
  ROUND(current_stock_sheets / NULLIF(sheets_per_unit, 1), 2) as display_units,
  ROUND(threshold_sheets / NULLIF(sheets_per_unit, 1), 2) as display_threshold
FROM inventory 
LIMIT 10;