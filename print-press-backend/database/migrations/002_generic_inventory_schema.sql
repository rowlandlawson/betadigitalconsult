-- Add attributes column for flexible data
ALTER TABLE inventory ADD COLUMN attributes JSONB;

-- Rename sheet-specific columns to be more generic
ALTER TABLE inventory RENAME COLUMN current_stock_sheets TO current_stock;
ALTER TABLE inventory RENAME COLUMN threshold_sheets TO threshold;

-- Migrate existing paper-specific data into the attributes column
UPDATE inventory
SET attributes = jsonb_build_object(
  'paper_size', paper_size,
  'paper_type', paper_type,
  'grammage', grammage,
  'sheets_per_unit', sheets_per_unit
)
WHERE category = 'Paper' OR paper_size IS NOT NULL OR paper_type IS NOT NULL;

-- Remove old paper-specific columns
ALTER TABLE inventory
DROP COLUMN paper_size,
DROP COLUMN paper_type,
DROP COLUMN grammage,
DROP COLUMN sheets_per_unit;

-- Optionally, add a material_type column if you want more rigid classification
-- ALTER TABLE inventory ADD COLUMN material_type VARCHAR(50);
-- UPDATE inventory SET material_type = 'paper' WHERE category = 'Paper';
