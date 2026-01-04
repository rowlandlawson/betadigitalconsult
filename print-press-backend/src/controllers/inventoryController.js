// print-press-backend/src/controllers/inventoryController.js
import { pool } from '../config/database.js';
import { NotificationService } from '../services/notificationService.js';
import { broadcastToAdmins } from '../websocket/notificationServer.js';

const notificationService = new NotificationService();

// Helper to get display stock based on attributes
const getDisplayStock = (item) => {
  const attributes = item.attributes || {};
  const currentStock = parseFloat(item.current_stock) || 0;
  
  // For paper items, current_stock is stored in SHEETS, so we display it as reams + sheets
  if (item.category === 'Paper' && attributes.sheets_per_unit) {
    const sheetsPerUnit = parseInt(attributes.sheets_per_unit) || 500;
    // current_stock is already in sheets, so we convert to display format
    const reams = Math.floor(currentStock / sheetsPerUnit);
    const sheets = currentStock % sheetsPerUnit;
    if (reams > 0 && sheets > 0) {
      return `${reams} ream${reams !== 1 ? 's' : ''}, ${sheets} sheet${sheets !== 1 ? 's' : ''}`;
    } else if (reams > 0) {
      return `${reams} ream${reams !== 1 ? 's' : ''}`;
    } else {
      return `${sheets} sheet${sheets !== 1 ? 's' : ''}`;
    }
  }
  
  return `${currentStock} ${item.unit_of_measure || 'units'}`;
};

// Helper to get attribute with fallback
const getAttribute = (attributes, key, defaultValue = '') => {
  return attributes?.[key] || defaultValue;
};

// Helper to get stock status
const getStockStatus = (currentStock, threshold) => {
  if (currentStock <= threshold) return 'CRITICAL';
  if (currentStock <= threshold * 1.5) return 'LOW';
  return 'HEALTHY';
};

export class InventoryController {
  // ============ BASIC CRUD OPERATIONS ============
  
  // Get all inventory items
  async getInventory(req, res) {
    try {
      const { page = 1, limit = 50, category, low_stock, search } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          id,
          material_name,
          category,
          current_stock,
          unit_of_measure,
          unit_cost,
          threshold,
          attributes,
          supplier,
          selling_price,
          reorder_quantity,
          is_active,
          created_at,
          updated_at,
          COUNT(*) OVER() as total_count,
          CASE 
            WHEN category = 'Paper' AND attributes->>'sheets_per_unit' IS NOT NULL THEN
              (current_stock * unit_cost / NULLIF((attributes->>'sheets_per_unit')::integer, 0))
            ELSE
              (current_stock * unit_cost)
          END as stock_value,
          CASE 
            WHEN current_stock <= threshold THEN 'CRITICAL'
            WHEN current_stock <= threshold * 1.5 THEN 'LOW'
            ELSE 'HEALTHY'
          END as stock_status,
          ROUND((current_stock / NULLIF(threshold, 0)) * 100, 2) as stock_percentage
        FROM inventory 
        WHERE is_active = true
      `;
      const params = [];
      let paramCount = 0;

      if (category) {
        paramCount++;
        query += ` AND category = $${paramCount}`;
        params.push(category);
      }

      if (low_stock === 'true') {
        query += ` AND current_stock <= threshold * 1.5`;
      }

      if (search) {
        paramCount++;
        query += ` AND (
          material_name ILIKE $${paramCount} OR 
          category ILIKE $${paramCount} OR
          supplier ILIKE $${paramCount} OR
          attributes::text ILIKE $${paramCount}
        )`;
        params.push(`%${search}%`);
      }

      query += ` ORDER BY stock_percentage ASC, material_name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      const inventory = result.rows.map(item => ({
        ...item,
        display_stock: getDisplayStock(item),
        // Extract common attributes for easy access
        paper_size: getAttribute(item.attributes, 'paper_size'),
        paper_type: getAttribute(item.attributes, 'paper_type'),
        grammage: getAttribute(item.attributes, 'grammage'),
        sheets_per_unit: getAttribute(item.attributes, 'sheets_per_unit', 500),
        color: getAttribute(item.attributes, 'color'),
        volume_ml: getAttribute(item.attributes, 'volume_ml'),
        plate_size: getAttribute(item.attributes, 'plate_size'),
        chemical_type: getAttribute(item.attributes, 'chemical_type'),
        concentration: getAttribute(item.attributes, 'concentration'),
        volume_l: getAttribute(item.attributes, 'volume_l'),
      }));

      res.json({
        inventory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows[0]?.total_count || 0,
        },
      });
    } catch (error) {
      console.error('Get inventory error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get categories
  async getCategories(req, res) {
    try {
      const result = await pool.query(
        'SELECT DISTINCT category FROM inventory WHERE is_active = true ORDER BY category'
      );
      res.json({ categories: result.rows.map(row => row.category) });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get category-specific attribute templates
  async getAttributeTemplates(req, res) {
    try {
      const templates = {
        'Paper': [
          { name: 'paper_size', label: 'Paper Size', type: 'text', placeholder: 'A4, A3, etc.' },
          { name: 'paper_type', label: 'Paper Type', type: 'text', placeholder: 'Glossy, Matte, etc.' },
          { name: 'grammage', label: 'Grammage (g)', type: 'number', placeholder: '120' },
          { name: 'sheets_per_unit', label: 'Sheets per Unit', type: 'number', placeholder: '500', default: 500 }
        ],
        'Ink': [
          { name: 'color', label: 'Color', type: 'text', placeholder: 'Cyan, Magenta, etc.' },
          { name: 'volume_ml', label: 'Volume (ml)', type: 'number', placeholder: '1000' },
          { name: 'type', label: 'Ink Type', type: 'text', placeholder: 'Dye-based, Pigment, etc.' }
        ],
        'Plates': [
          { name: 'plate_size', label: 'Plate Size', type: 'text', placeholder: '10x15, 20x30, etc.' },
          { name: 'material', label: 'Material', type: 'text', placeholder: 'Aluminum, Polyester, etc.' }
        ],
        'Chemicals': [
          { name: 'chemical_type', label: 'Chemical Type', type: 'text', placeholder: 'Developer, Fixer, etc.' },
          { name: 'concentration', label: 'Concentration', type: 'text', placeholder: '1:10, 1:20, etc.' },
          { name: 'volume_l', label: 'Volume (L)', type: 'number', placeholder: '5' }
        ],
        'Consumables': [
          { name: 'description', label: 'Description', type: 'text', placeholder: 'Additional details' }
        ],
        'Tools': [
          { name: 'tool_type', label: 'Tool Type', type: 'text', placeholder: 'Cutting, Measuring, etc.' },
          { name: 'size', label: 'Size', type: 'text', placeholder: 'Small, Medium, Large' }
        ],
        'Packaging': [
          { name: 'packaging_type', label: 'Packaging Type', type: 'text', placeholder: 'Box, Envelope, etc.' },
          { name: 'dimensions', label: 'Dimensions', type: 'text', placeholder: '10x15x5 cm' }
        ],
        'General': [
          { name: 'description', label: 'Description', type: 'text', placeholder: 'Additional details' }
        ]
      };
      
      res.json({ templates });
    } catch (error) {
      console.error('Get attribute templates error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get an inventory item by ID
  async getInventoryItem(req, res) {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'SELECT * FROM inventory WHERE id = $1 AND is_active = true', 
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      const item = result.rows[0];
      res.json({
        item: {
          ...item,
          display_stock: getDisplayStock(item),
          attributes: item.attributes || {}
        },
      });
    } catch (error) {
      console.error('Get inventory item error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get low stock alerts
  async getLowStockAlerts(req, res) {
    try {
      const query = `
        SELECT 
          id,
          material_name,
          category,
          current_stock,
          unit_of_measure,
          unit_cost,
          threshold,
          attributes,
          supplier,
          reorder_quantity,
          is_active,
          created_at,
          updated_at,
          CASE 
            WHEN category = 'Paper' AND attributes->>'sheets_per_unit' IS NOT NULL THEN
              (current_stock * unit_cost / NULLIF((attributes->>'sheets_per_unit')::integer, 0))
            ELSE
              (current_stock * unit_cost)
          END as stock_value,
          CASE 
            WHEN current_stock <= threshold THEN 'CRITICAL'
            WHEN current_stock <= threshold * 1.5 THEN 'LOW'
            ELSE 'HEALTHY'
          END as stock_status,
          ROUND((current_stock / NULLIF(threshold, 0)) * 100, 2) as stock_percentage
        FROM inventory 
        WHERE is_active = true AND current_stock <= threshold * 1.5
        ORDER BY stock_percentage ASC, material_name
      `;

      const result = await pool.query(query);

      const low_stock_items = result.rows.map(item => ({
        ...item,
        display_stock: getDisplayStock(item),
        display_threshold: `${item.threshold} ${item.unit_of_measure}`,
      }));

      res.json({ low_stock_items });
    } catch (error) {
      console.error('Get low stock alerts error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Create a new inventory item
  async createInventory(req, res) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const {
        material_name,
        category,
        current_stock = 0,
        unit_of_measure,
        unit_cost = 0,
        threshold = 0,
        attributes = {},
        supplier,
        selling_price,
        reorder_quantity,
      } = req.body;

      if (!material_name || !category || !unit_of_measure) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Material name, category, and unit of measure are required.' 
        });
      }

      // Validate attributes based on category
      const validatedAttributes = inventoryController.validateAttributes(category, attributes)

      // For paper items, convert current_stock and threshold to sheets if unit_of_measure indicates reams
      let stockInSheets = parseFloat(current_stock);
      let thresholdInSheets = parseFloat(threshold);
      
      if (category === 'Paper') {
        const sheetsPerUnit = parseInt(validatedAttributes.sheets_per_unit) || 500;
        // If unit_of_measure contains "ream", convert reams to sheets
        if (unit_of_measure && unit_of_measure.toLowerCase().includes('ream')) {
          stockInSheets = stockInSheets * sheetsPerUnit;
          thresholdInSheets = thresholdInSheets * sheetsPerUnit;
        }
        // If unit_of_measure is "sheet" or "sheets", values are already in sheets
        // Otherwise, assume they're already in sheets (for backward compatibility)
      }

      const result = await client.query(
        `INSERT INTO inventory (
          material_name, category, current_stock, unit_of_measure, unit_cost, 
          threshold, attributes, supplier, selling_price, reorder_quantity, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
        RETURNING *`,
        [
          material_name,
          category,
          stockInSheets,
          unit_of_measure,
          unit_cost,
          thresholdInSheets,
          JSON.stringify(validatedAttributes),
          supplier || null,
          selling_price || null,
          reorder_quantity || null,
        ]
      );

      const newItem = result.rows[0];

      // Check stock level and send notification if low
      if (newItem.current_stock <= newItem.threshold) {
        await notificationService.createNotification({
          title: 'Low Stock Alert',
          message: `${newItem.material_name} is below threshold. Current stock: ${getDisplayStock(newItem)}`,
          type: 'low_stock',
          relatedEntityType: 'inventory',
          relatedEntityId: newItem.id,
          priority: 'high',
        });
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Inventory item created successfully',
        item: {
          ...newItem,
          display_stock: getDisplayStock(newItem),
          attributes: newItem.attributes || {}
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create inventory error:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  }

  // Update an inventory item
  async updateInventory(req, res) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { id } = req.params;
      const {
        material_name,
        category,
        unit_of_measure,
        threshold,
        attributes,
        supplier,
        selling_price,
        reorder_quantity,
        is_active,
      } = req.body;

      // Get current item to merge attributes and check category
      const currentItem = await client.query(
        'SELECT category, attributes, unit_of_measure FROM inventory WHERE id = $1',
        [id]
      );

      if (currentItem.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      const existingCategory = currentItem.rows[0].category;
      const finalCategory = category || existingCategory;

      let updatedAttributes = attributes;
      if (currentItem.rows.length > 0 && attributes) {
        // Merge new attributes with existing ones
        const currentAttributes = currentItem.rows[0].attributes || {};
        updatedAttributes = { ...currentAttributes, ...attributes };
      }

      // Validate attributes if category is being updated
      if (category && updatedAttributes) {
        updatedAttributes = inventoryController.validateAttributes(category, updatedAttributes);
      }

      // For paper items, convert threshold to sheets if unit_of_measure indicates reams
      let thresholdInSheets = threshold;
      const finalUnitOfMeasure = unit_of_measure || currentItem.rows[0].unit_of_measure;
      
      if (finalCategory === 'Paper' && threshold !== null && threshold !== undefined) {
        const sheetsPerUnit = parseInt(updatedAttributes?.sheets_per_unit || currentItem.rows[0].attributes?.sheets_per_unit) || 500;
        // If unit_of_measure contains "ream", convert reams to sheets
        if (finalUnitOfMeasure && finalUnitOfMeasure.toLowerCase().includes('ream')) {
          thresholdInSheets = parseFloat(threshold) * sheetsPerUnit;
        } else {
          thresholdInSheets = parseFloat(threshold);
        }
      } else if (threshold !== null && threshold !== undefined) {
        thresholdInSheets = parseFloat(threshold);
      }

      const result = await client.query(
        `UPDATE inventory 
         SET 
           material_name = COALESCE($1, material_name),
           category = COALESCE($2, category),
           unit_of_measure = COALESCE($3, unit_of_measure),
           threshold = COALESCE($4, threshold),
           attributes = COALESCE($5, attributes),
           supplier = COALESCE($6, supplier),
           selling_price = COALESCE($7, selling_price),
           reorder_quantity = COALESCE($8, reorder_quantity),
           is_active = COALESCE($9, is_active),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $10
         RETURNING *`,
        [
          material_name,
          category,
          unit_of_measure,
          thresholdInSheets,
          updatedAttributes ? JSON.stringify(updatedAttributes) : null,
          supplier,
          selling_price,
          reorder_quantity,
          is_active,
          id,
        ]
      );
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      await client.query('COMMIT');
      res.json({
        message: 'Inventory item updated successfully',
        item: result.rows[0],
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update inventory error:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  }

  // Delete inventory item (soft delete)
  async deleteInventory(req, res) {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'UPDATE inventory SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      res.json({ message: 'Inventory item deleted successfully' });
    } catch (error) {
      console.error('Delete inventory error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ============ STOCK MANAGEMENT ============
  
  // Adjust stock (add, remove, or set)
  async adjustStock(req, res) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { id } = req.params;
      const { 
        adjustment_type, // 'add', 'remove', 'set'
        quantity, 
        purchase_cost, // optional: total cost of the new stock
        unit_price, // optional: unit price per unit (will be used as new unit_cost)
        reason, 
        notes 
      } = req.body;

      if (!adjustment_type || !quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Adjustment type and quantity are required.' });
      }

      const inventoryResult = await client.query(
        'SELECT * FROM inventory WHERE id = $1 FOR UPDATE', 
        [id]
      );
      
      if (inventoryResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      const item = inventoryResult.rows[0];
      const previousStock = parseFloat(item.current_stock);
      
      // For paper items, convert quantity to sheets if unit_of_measure indicates reams
      let quantityInSheets = parseFloat(quantity);
      if (item.category === 'Paper') {
        const attributes = item.attributes || {};
        const sheetsPerUnit = parseInt(attributes.sheets_per_unit) || 500;
        // If unit_of_measure contains "ream", convert reams to sheets
        if (item.unit_of_measure && item.unit_of_measure.toLowerCase().includes('ream')) {
          quantityInSheets = quantityInSheets * sheetsPerUnit;
        }
        // If unit_of_measure is "sheet" or "sheets", quantity is already in sheets
        // Otherwise, assume it's already in sheets (for backward compatibility)
      }
      
      let newStock;

      if (adjustment_type === 'add') {
        newStock = previousStock + quantityInSheets;
      } else if (adjustment_type === 'remove') {
        newStock = previousStock - quantityInSheets;
        if (newStock < 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Insufficient stock for removal.' });
        }
      } else if (adjustment_type === 'set') {
        newStock = quantityInSheets;
      } else {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid adjustment type.' });
      }
      
      let newUnitCost = parseFloat(item.unit_cost);
      // If adding stock with a unit_price, use that as the new unit cost
      // Otherwise, if purchase_cost is provided, calculate average unit cost
      if (adjustment_type === 'add') {
        if (unit_price !== undefined && unit_price !== null && parseFloat(unit_price) > 0) {
          // Use the entered unit price as the new unit cost
          // For paper items, unit_price is per ream (if unit_of_measure is "ream")
          // For non-paper items, unit_price is per unit
          newUnitCost = parseFloat(unit_price);
        } else if (purchase_cost && parseFloat(quantity) > 0) {
          // Calculate average unit cost based on purchase cost
          // For paper items, need to handle conversion properly
          if (item.category === 'Paper') {
            const attributes = item.attributes || {};
            const sheetsPerUnit = parseInt(attributes.sheets_per_unit) || 500;
            const unitOfMeasure = item.unit_of_measure || '';
            // If unit_of_measure contains "ream", purchase_cost is total for reams
            if (unitOfMeasure.toLowerCase().includes('ream')) {
              // Calculate cost per ream from total purchase cost
              const costPerReam = parseFloat(purchase_cost) / parseFloat(quantity);
              newUnitCost = costPerReam; // Store as cost per ream
            } else {
              // Purchase is in sheets, calculate cost per sheet then convert to cost per ream
              const costPerSheet = parseFloat(purchase_cost) / quantityInSheets;
              newUnitCost = costPerSheet * sheetsPerUnit; // Store as cost per ream
            }
          } else {
            // For non-paper items, calculate average
            const existingValue = previousStock * item.unit_cost;
            const additionValue = parseFloat(purchase_cost);
            newUnitCost = (existingValue + additionValue) / newStock;
          }
        }
      }

      await client.query(
        'UPDATE inventory SET current_stock = $1, unit_cost = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [newStock, newUnitCost, id]
      );

      await client.query(
        `INSERT INTO stock_adjustments (
          material_id, adjustment_type, quantity, previous_stock, new_stock, reason, notes, adjusted_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, adjustment_type, quantity, previousStock, newStock, reason, notes, req.user.userId]
      );

      const updatedResult = await client.query(
        'SELECT * FROM inventory WHERE id = $1', 
        [id]
      );
      
      const updatedItem = updatedResult.rows[0];

      // Check stock level after adjustment
      if (updatedItem.current_stock <= updatedItem.threshold) {
        await notificationService.createNotification({
          title: 'Low Stock Alert',
          message: `${updatedItem.material_name} is below threshold. Current stock: ${getDisplayStock(updatedItem)}`,
          type: 'low_stock',
          relatedEntityType: 'inventory',
          relatedEntityId: updatedItem.id,
          priority: 'high',
        });
      }

      await client.query('COMMIT');
      
      res.json({
        message: 'Stock adjusted successfully',
        item: updatedItem,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Adjust stock error:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  }

  // Record material usage
  async recordUsage(req, res) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { material_id, job_id, quantity_used, notes } = req.body;

      if (!material_id || !quantity_used || quantity_used <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid usage data' });
      }

      const inventoryResult = await client.query(
        'SELECT * FROM inventory WHERE id = $1 FOR UPDATE', 
        [material_id]
      );
      
      if (inventoryResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Material not found' });
      }

      const item = inventoryResult.rows[0];

      // For paper items, convert quantity_used to sheets if unit_of_measure indicates reams
      let quantityInSheets = parseFloat(quantity_used);
      if (item.category === 'Paper') {
        const attributes = item.attributes || {};
        const sheetsPerUnit = parseInt(attributes.sheets_per_unit) || 500;
        // If unit_of_measure contains "ream", convert reams to sheets
        if (item.unit_of_measure && item.unit_of_measure.toLowerCase().includes('ream')) {
          quantityInSheets = quantityInSheets * sheetsPerUnit;
        }
        // If unit_of_measure is "sheet" or "sheets", quantity is already in sheets
      }

      // For paper items, current_stock is in sheets, so compare directly
      const currentStockSheets = parseFloat(item.current_stock) || 0;
      
      if (quantityInSheets > currentStockSheets) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient stock' });
      }

      const newStock = currentStockSheets - quantityInSheets;
      // Calculate cost based on sheets for paper items
      let totalCost;
      if (item.category === 'Paper') {
        const attributes = item.attributes || {};
        const sheetsPerUnit = parseInt(attributes.sheets_per_unit) || 500;
        const costPerSheet = parseFloat(item.unit_cost) / sheetsPerUnit;
        totalCost = quantityInSheets * costPerSheet;
      } else {
        totalCost = quantityInSheets * item.unit_cost;
      }

      await client.query(
        'UPDATE inventory SET current_stock = $1 WHERE id = $2',
        [newStock, material_id]
      );

      const usageResult =       await client.query(
        `INSERT INTO material_usage (
          material_id, job_id, quantity_used, quantity_sheets, unit_cost, total_cost, usage_type, notes, recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, 'production', $7, $8)
        RETURNING *`,
        [
          material_id, 
          job_id, 
          item.category === 'Paper' ? (quantityInSheets / (parseInt(item.attributes?.sheets_per_unit) || 500)) : quantity_used, // quantity_used in units
          item.category === 'Paper' ? quantityInSheets : null, // quantity_sheets for paper
          item.unit_cost, 
          totalCost, 
          notes, 
          req.user.id
        ]
      );
      
      if (newStock <= item.threshold) {
        await notificationService.createNotification({
          title: 'Low Stock Alert',
          message: `${item.material_name} is below threshold. Current stock: ${getDisplayStock({...item, current_stock: newStock})}`,
          type: 'low_stock',
          relatedEntityType: 'inventory',
          relatedEntityId: item.id,
          priority: 'high',
        });
      }

      await client.query('COMMIT');
      res.status(201).json({
        message: 'Material usage recorded successfully',
        usage: usageResult.rows[0],
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Record usage error:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  }

  // ============ SEARCH & UTILITIES ============
  
  // Search inventory by material name or attributes
  async searchInventory(req, res) {
    try {
      const { query, category } = req.query;
      
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      let sql = `
        SELECT 
          id,
          material_name,
          category,
          current_stock,
          unit_of_measure,
          attributes,
          CASE 
            WHEN category = 'Paper' AND attributes->>'sheets_per_unit' IS NOT NULL THEN
              (current_stock * unit_cost / NULLIF((attributes->>'sheets_per_unit')::integer, 0))
            ELSE
              (current_stock * unit_cost)
          END as stock_value
        FROM inventory 
        WHERE is_active = true 
          AND (material_name ILIKE $1 OR attributes::text ILIKE $1)
      `;
      
      const params = [`%${query}%`];
      
      if (category) {
        sql += ` AND category = $2`;
        params.push(category);
      }
      
      sql += ` LIMIT 20`;
      
      const result = await pool.query(sql, params);
      
      res.json({
        results: result.rows.map(item => ({
          ...item,
          display_stock: getDisplayStock(item),
          attributes: item.attributes || {}
        }))
      });
    } catch (error) {
      console.error('Search inventory error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Quick stock check
  async quickStockCheck(req, res) {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        'SELECT * FROM inventory WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }
      
      const item = result.rows[0];
      const stockStatus = getStockStatus(item.current_stock, item.threshold);
      
      res.json({
        material: item.material_name,
        currentStock: getDisplayStock(item),
        threshold: `${item.threshold} ${item.unit_of_measure}`,
        status: stockStatus
      });
    } catch (error) {
      console.error('Stock check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Calculate sheets (for paper category)
  async calculateSheets(req, res) {
    try {
      const { reams = 0, sheets = 0, sheets_per_unit = 500 } = req.body;
      
      const totalSheets = (reams * sheets_per_unit) + sheets;
      const displayReams = Math.floor(totalSheets / sheets_per_unit);
      const displaySheets = totalSheets % sheets_per_unit;
      
      res.json({
        totalSheets,
        display: `${displayReams} reams, ${displaySheets} sheets`,
        reams: displayReams,
        sheets: displaySheets
      });
    } catch (error) {
      console.error('Calculate sheets error:', error);
      res.status(500).json({ error: 'Calculation error' });
    }
  }

  // Update job materials
  async updateJobMaterials(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { jobId } = req.params;
      const { materials } = req.body;

      for (const material of materials) {
        if (material.material_id) {
          const invResult = await client.query(
            'SELECT * FROM inventory WHERE id = $1',
            [material.material_id]
          );

          if (invResult.rows.length > 0) {
            const inventoryItem = invResult.rows[0];
            const sheetsUsed = material.quantity;
            const newStock = inventoryItem.current_stock - sheetsUsed;
            
            await client.query(
              'UPDATE inventory SET current_stock = $1 WHERE id = $2',
              [newStock, material.material_id]
            );

            await client.query(
              `INSERT INTO materials_used (
                job_id, material_id, material_name, quantity, unit_cost, total_cost
              ) VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                jobId,
                material.material_id,
                material.material_name,
                material.quantity,
                material.unit_cost || inventoryItem.unit_cost,
                material.total_cost || (material.quantity * inventoryItem.unit_cost)
              ]
            );
          }
        }
      }

      await client.query('COMMIT');
      res.json({ message: 'Job materials updated successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update job materials error:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  }

  // ============ MATERIAL MONITORING METHODS ============
  
  // Get material usage trends
  async getMaterialUsageTrends(req, res) {
    try {
      const { period = 'month', months = 6 } = req.query;

      const query = `
        SELECT 
          DATE_TRUNC($1, j.date_requested) as period,
          mu.material_name,
          SUM(mu.quantity) as total_quantity,
          SUM(mu.total_cost) as total_cost,
          AVG(mu.unit_cost) as average_unit_cost
        FROM materials_used mu
        JOIN jobs j ON mu.job_id = j.id
        WHERE j.date_requested >= CURRENT_DATE - INTERVAL '${months} months'
        GROUP BY period, mu.material_name
        ORDER BY period DESC, total_cost DESC
      `;

      const result = await pool.query(query, [period]);
      res.json({ material_usage_trends: result.rows });
    } catch (error) {
      console.error('Get material usage trends error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get waste analysis
  async getWasteAnalysis(req, res) {
    try {
      const { months = 3 } = req.query;

      const query = `
        SELECT 
          type,
          waste_reason,
          COUNT(*) as occurrence_count,
          SUM(total_cost) as total_cost,
          AVG(total_cost) as average_cost
        FROM waste_expenses 
        WHERE created_at >= CURRENT_DATE - INTERVAL '${months} months'
        GROUP BY type, waste_reason
        ORDER BY total_cost DESC
      `;

      const result = await pool.query(query);
      res.json({ waste_analysis: result.rows });
    } catch (error) {
      console.error('Get waste analysis error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get stock levels
  async getStockLevels(req, res) {
    try {
      const query = `
        SELECT 
          material_name,
          category,
          current_stock,
          threshold,
          unit_of_measure,
          unit_cost,
          CASE 
            WHEN category = 'Paper' AND attributes->>'sheets_per_unit' IS NOT NULL THEN
              (current_stock * unit_cost / NULLIF((attributes->>'sheets_per_unit')::integer, 0))
            ELSE
              (current_stock * unit_cost)
          END as stock_value,
          ROUND((current_stock / threshold) * 100, 2) as stock_percentage,
          CASE 
            WHEN current_stock <= threshold THEN 'CRITICAL'
            WHEN current_stock <= threshold * 1.5 THEN 'LOW'
            ELSE 'HEALTHY'
          END as stock_status
        FROM inventory 
        WHERE is_active = true 
        ORDER BY stock_percentage ASC, stock_value DESC
      `;

      const result = await pool.query(query);
      res.json({ stock_levels: result.rows });
    } catch (error) {
      console.error('Get stock levels error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get cost analysis
  async getCostAnalysis(req, res) {
    try {
      const { months = 6 } = req.query;

      // Get usage costs
      const usageQuery = `
        SELECT 
          DATE_TRUNC('month', j.date_requested) as period,
          SUM(mu.total_cost) as usage_cost,
          COUNT(DISTINCT j.id) as usage_count
        FROM materials_used mu
        JOIN jobs j ON mu.job_id = j.id
        WHERE j.date_requested >= CURRENT_DATE - INTERVAL '${months} months'
        GROUP BY period
        ORDER BY period DESC
      `;

      // Get waste costs
      const wasteQuery = `
        SELECT 
          DATE_TRUNC('month', created_at) as period,
          SUM(total_cost) as waste_cost,
          COUNT(*) as waste_count
        FROM waste_expenses 
        WHERE created_at >= CURRENT_DATE - INTERVAL '${months} months'
        GROUP BY period
        ORDER BY period DESC
      `;

      // Get total inventory value
      const totalValueQuery = `
        SELECT COALESCE(SUM(
          CASE 
            WHEN category = 'Paper' AND attributes->>'sheets_per_unit' IS NOT NULL THEN
              (current_stock * unit_cost / NULLIF((attributes->>'sheets_per_unit')::integer, 0))
            ELSE
              (current_stock * unit_cost)
          END
        ), 0) as total_inventory_value
        FROM inventory WHERE is_active = true
      `;

      const [usageResult, wasteResult, totalValueResult] = await Promise.all([
        pool.query(usageQuery),
        pool.query(wasteQuery),
        pool.query(totalValueQuery)
      ]);

      res.json({
        usage_costs: usageResult.rows,
        waste_costs: wasteResult.rows,
        total_inventory_value: parseFloat(totalValueResult.rows[0].total_inventory_value)
      });
    } catch (error) {
      console.error('Get cost analysis error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get automatic stock updates
  async getAutomaticStockUpdates(req, res) {
    try {
      const { days = 30 } = req.query;

      const query = `
        SELECT 
          mu.material_name,
          i.current_stock as current_inventory,
          SUM(mu.quantity) as materials_used,
          i.threshold,
          (i.current_stock - SUM(mu.quantity)) as projected_stock,
          CASE 
            WHEN (i.current_stock - SUM(mu.quantity)) <= i.threshold THEN 'NEEDS_REORDER'
            WHEN (i.current_stock - SUM(mu.quantity)) <= i.threshold * 1.5 THEN 'MONITOR'
            ELSE 'HEALTHY'
          END as stock_health
        FROM materials_used mu
        JOIN jobs j ON mu.job_id = j.id
        JOIN inventory i ON mu.material_name = i.material_name
        WHERE j.date_requested >= CURRENT_DATE - INTERVAL '${days} days'
        AND j.status IN ('in_progress', 'completed')
        AND i.is_active = true
        GROUP BY mu.material_name, i.current_stock, i.threshold
        ORDER BY stock_health, projected_stock ASC
      `;

      const result = await pool.query(query);
      res.json({ automatic_updates: result.rows });
    } catch (error) {
      console.error('Get automatic stock updates error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get material cost analysis
  async getMaterialCostAnalysis(req, res) {
    try {
      const { months = 6 } = req.query;

      const query = `
        SELECT 
          mu.material_name,
          COUNT(DISTINCT j.id) as jobs_count,
          SUM(mu.quantity) as total_quantity,
          SUM(mu.total_cost) as total_cost,
          AVG(mu.unit_cost) as avg_unit_cost,
          MAX(mu.unit_cost) as max_unit_cost,
          MIN(mu.unit_cost) as min_unit_cost
        FROM materials_used mu
        JOIN jobs j ON mu.job_id = j.id
        WHERE j.date_requested >= CURRENT_DATE - INTERVAL '${months} months'
        GROUP BY mu.material_name
        ORDER BY total_cost DESC
      `;

      const result = await pool.query(query);
      res.json({ material_cost_analysis: result.rows });
    } catch (error) {
      console.error('Get material cost analysis error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ============ HELPER METHODS ============
  
  // Helper to validate attributes based on category
  validateAttributes(category, attributes) {
    if (!attributes || typeof attributes !== 'object') {
      return {};
    }

    const validated = { ...attributes };

    // Category-specific validation
    switch (category) {
      case 'Paper':
        // Ensure numeric fields are numbers
        if (validated.grammage) validated.grammage = Number(validated.grammage) || 0;
        if (validated.sheets_per_unit) validated.sheets_per_unit = Number(validated.sheets_per_unit) || 500;
        break;
      case 'Ink':
        if (validated.volume_ml) validated.volume_ml = Number(validated.volume_ml) || 0;
        break;
      case 'Chemicals':
        if (validated.volume_l) validated.volume_l = Number(validated.volume_l) || 0;
        break;
    }

    return validated;
  }

  // Get material history (for backward compatibility)
  async getMaterialHistory(req, res) {
    try {
      const { material_id, days = 30 } = req.query;
      
      if (!material_id) {
        return res.status(400).json({ error: 'Material ID is required' });
      }

      const inventoryResult = await pool.query(
        'SELECT * FROM inventory WHERE id = $1',
        [material_id]
      );

      if (inventoryResult.rows.length === 0) {
        return res.status(404).json({ error: 'Material not found' });
      }

      const inventoryItem = inventoryResult.rows[0];

      const usageHistory = await pool.query(
        `SELECT 
          mu.*,
          j.ticket_id,
          j.description as job_description,
          TO_CHAR(mu.usage_date, 'YYYY-MM-DD HH24:MI') as formatted_date,
          u.name as recorded_by_name
         FROM material_usage mu
         LEFT JOIN jobs j ON mu.job_id = j.id
         LEFT JOIN users u ON mu.recorded_by = u.id
         WHERE mu.material_id = $1 
         AND mu.usage_date >= CURRENT_DATE - INTERVAL '${days} days'
         ORDER BY mu.usage_date DESC`,
        [material_id]
      );

      const wasteHistory = await pool.query(
        `SELECT 
          mw.*,
          j.ticket_id,
          TO_CHAR(mw.waste_date, 'YYYY-MM-DD HH24:MI') as formatted_date,
          u.name as recorded_by_name
         FROM material_waste mw
         LEFT JOIN jobs j ON mw.job_id = j.id
         LEFT JOIN users u ON mw.recorded_by = u.id
         WHERE mw.material_id = $1 
         AND mw.waste_date >= CURRENT_DATE - INTERVAL '${days} days'
         ORDER BY mw.waste_date DESC`,
        [material_id]
      );

      const totalUsed = usageHistory.rows.reduce((sum, row) => sum + parseFloat(row.quantity_used), 0);
      const totalWasted = wasteHistory.rows.reduce((sum, row) => sum + parseFloat(row.quantity_wasted), 0);

      res.json({
        material: {
          ...inventoryItem,
          display_stock: getDisplayStock(inventoryItem)
        },
        history: {
          usage: usageHistory.rows,
          waste: wasteHistory.rows
        },
        totals: {
          used: totalUsed,
          wasted: totalWasted
        }
      });
    } catch (error) {
      console.error('Get material history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const inventoryController = new InventoryController();