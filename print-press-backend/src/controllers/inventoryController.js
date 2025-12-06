import { pool } from '../config/database.js';
import { NotificationService } from '../services/notificationService.js';
import { broadcastToAdmins } from '../websocket/notificationServer.js';
import { SheetCalculator } from '../utils/sheetCalculator.js';

const notificationService = new NotificationService();

export class InventoryController {
  // Get all inventory items with sheet-based display
  async getInventory(req, res) {
    try {
      const { page = 1, limit = 50, category, low_stock, search } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          *,
          COUNT(*) OVER() as total_count,
          (current_stock * unit_cost) as stock_value,
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
        query += ` AND (material_name ILIKE $${paramCount} OR category ILIKE $${paramCount} OR supplier ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      query += ` ORDER BY stock_percentage ASC, material_name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      console.log('Executing query:', query);
      console.log('Query parameters:', params);

      const result = await pool.query(query, params);
      console.log('Query result:', result);

      // Format display for each item
      const inventory = result.rows.map(item => ({
        ...item,
        display_stock: SheetCalculator.toDisplay(item.current_stock, item.sheets_per_unit),
        display_threshold: SheetCalculator.toDisplay(item.threshold, item.sheets_per_unit)
      }));

      res.json({
        inventory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.rows[0]?.total_count || 0
        }
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

  // Get low stock alerts
  async getLowStockAlerts(req, res) {
    try {
      const result = await pool.query(
        `SELECT 
          id,
          material_name,
          current_stock_sheets,
          threshold_sheets,
          sheets_per_unit,
          unit_cost,
          cost_per_sheet,
          ROUND((current_stock_sheets / NULLIF(threshold_sheets, 0)) * 100, 2) as stock_percentage,
          CASE 
            WHEN current_stock_sheets <= threshold_sheets THEN 'CRITICAL'
            WHEN current_stock_sheets <= threshold_sheets * 1.5 THEN 'LOW'
            ELSE 'HEALTHY'
          END as stock_status
         FROM inventory 
         WHERE is_active = true AND current_stock_sheets <= threshold_sheets * 1.5
         ORDER BY current_stock_sheets ASC`
      );

      const alerts = result.rows.map(item => ({
        ...item,
        display_stock: SheetCalculator.toDisplay(item.current_stock_sheets, item.sheets_per_unit),
        display_threshold: SheetCalculator.toDisplay(item.threshold_sheets, item.sheets_per_unit)
      }));

      res.json({ low_stock_items: alerts });
    } catch (error) {
      console.error('Get low stock error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get inventory item by ID
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
          display_stock: SheetCalculator.toDisplay(item.current_stock_sheets, item.sheets_per_unit),
          display_threshold: SheetCalculator.toDisplay(item.threshold_sheets, item.sheets_per_unit)
        }
      });
    } catch (error) {
      console.error('Get inventory item error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Create inventory item
  async createInventory(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        material_name,
        category,
        paper_size,
        paper_type,
        grammage,
        supplier,
        unit_of_measure = 'sheet',
        unit_cost,
        selling_price,
        sheets_per_unit = 500,
        reams_stock = 0,
        sheets_stock = 0,
        total_sheets_stock,
        threshold_reams = 0.5,
        threshold_sheets = 100,
        reorder_quantity = 1,
        supplier_contact
      } = req.body;

      if (!material_name || !category || !unit_cost) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Missing required fields' });
      }

      let totalSheets;
      if (total_sheets_stock !== undefined) {
        totalSheets = parseInt(total_sheets_stock);
      } else {
        totalSheets = SheetCalculator.toSheets(
          parseFloat(reams_stock),
          parseInt(sheets_stock),
          parseInt(sheets_per_unit)
        );
      }

      const finalThresholdSheets = threshold_sheets || 
        SheetCalculator.toSheets(threshold_reams, 0, sheets_per_unit);
      const costPerSheet = unit_cost / sheets_per_unit;

      const result = await client.query(
        `INSERT INTO inventory (
          material_name, category, paper_size, paper_type, grammage, supplier,
          unit_of_measure, unit_cost, selling_price, sheets_per_unit,
          current_stock_sheets, threshold_sheets, reorder_quantity,
          supplier_contact, cost_per_sheet
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          material_name,
          category,
          paper_size,
          paper_type,
          grammage,
          supplier,
          unit_of_measure,
          unit_cost,
          selling_price,
          sheets_per_unit,
          totalSheets,
          finalThresholdSheets,
          reorder_quantity,
          supplier_contact,
          costPerSheet
        ]
      );

      const newItem = result.rows[0];
      const display = SheetCalculator.toDisplay(newItem.current_stock_sheets, newItem.sheets_per_unit);
      const stockStatus = SheetCalculator.checkStockStatus(
        newItem.current_stock_sheets, 
        newItem.threshold_sheets
      );

      if (stockStatus.isLow) {
        await notificationService.createNotification({
          title: 'Low Stock Alert',
          message: `${newItem.material_name} is below threshold. ${display.display}`,
          type: 'low_stock',
          relatedEntityType: 'inventory',
          relatedEntityId: newItem.id,
          priority: stockStatus.priority
        });
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Inventory item created successfully',
        item: {
          ...newItem,
          display_stock: display,
          stock_status: stockStatus
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create inventory error:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  }

  // Update inventory item
  async updateInventory(req, res) {
    try {
      const { id } = req.params;
      const {
        material_name,
        category,
        paper_size,
        paper_type,
        grammage,
        supplier,
        sheets_per_unit,
        unit_of_measure,
        unit_cost,
        threshold_sheets,
        reorder_quantity,
        is_active
      } = req.body;

      const currentItemResult = await pool.query(
        'SELECT is_active, unit_cost, sheets_per_unit FROM inventory WHERE id = $1',
        [id]
      );

      if (currentItemResult.rows.length === 0) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      const currentItem = currentItemResult.rows[0];
      const activeStatus = is_active !== undefined ? is_active : currentItem.is_active;

      const new_sheets_per_unit = sheets_per_unit || currentItem.sheets_per_unit;
      const new_unit_cost = unit_cost || currentItem.unit_cost;
      const costPerSheet = new_unit_cost / new_sheets_per_unit;

      const result = await pool.query(
        `UPDATE inventory 
         SET material_name = $1, category = $2, paper_size = $3, paper_type = $4, 
             grammage = $5, supplier = $6, sheets_per_unit = $7, unit_of_measure = $8,
             unit_cost = $9, threshold_sheets = $10, reorder_quantity = $11,
             is_active = $12, cost_per_sheet = $13, updated_at = CURRENT_TIMESTAMP
         WHERE id = $14
         RETURNING *`,
        [
          material_name,
          category,
          paper_size,
          paper_type,
          grammage,
          supplier,
          new_sheets_per_unit,
          unit_of_measure,
          new_unit_cost,
          threshold_sheets,
          reorder_quantity,
          activeStatus,
          costPerSheet,
          id
        ]
      );

      const updatedItem = result.rows[0];
      const stockStatus = SheetCalculator.checkStockStatus(updatedItem.current_stock_sheets, updatedItem.threshold_sheets);

      if (stockStatus.isLow) {
        const display = SheetCalculator.toDisplay(updatedItem.current_stock_sheets, updatedItem.sheets_per_unit);
        await notificationService.notifyLowStock({
          ...updatedItem,
          display_stock: display,
          stock_status: stockStatus
        });
        broadcastToAdmins({
          type: 'new_notification',
          notification: {
            title: 'Low Stock Alert',
            message: `${updatedItem.material_name} is running low. Current stock: ${display.display}`,
            type: 'low_stock',
            relatedEntityId: updatedItem.id,
            createdAt: new Date()
          }
        });
      }

      res.json({
        message: 'Inventory item updated successfully',
        item: updatedItem
      });
    } catch (error) {
      console.error('Update inventory error:', error);
      res.status(500).json({ error: 'Internal server error' });
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

  // Record material usage (old method for compatibility)
  async recordUsage(req, res) {
    try {
      const {
        material_id,
        job_id,
        quantity_used,
        unit_cost,
        usage_type = 'production',
        notes
      } = req.body;

      if (!material_id || !quantity_used || unit_cost === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        const usageResult = await client.query(
          `INSERT INTO material_usage (
            material_id, job_id, quantity_used, unit_cost, total_cost, usage_type, notes, recorded_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            material_id,
            job_id,
            quantity_used,
            unit_cost,
            quantity_used * unit_cost,
            usage_type,
            notes,
            req.user.id
          ]
        );

        await client.query(
          'UPDATE inventory SET current_stock = current_stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [quantity_used, material_id]
        );

        await client.query('COMMIT');

        res.status(201).json({
          message: 'Material usage recorded successfully',
          usage: usageResult.rows[0]
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Record usage error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Record waste (old method for compatibility)
  async recordWaste(req, res) {
    try {
      const {
        material_id,
        job_id,
        quantity_wasted,
        unit_cost,
        reason,
        notes
      } = req.body;

      if (!material_id || !quantity_wasted || unit_cost === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        const wasteResult = await client.query(
          `INSERT INTO material_waste (
            material_id, job_id, quantity_wasted, unit_cost, total_cost, reason, notes, recorded_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            material_id,
            job_id,
            quantity_wasted,
            unit_cost,
            quantity_wasted * unit_cost,
            reason,
            notes,
            req.user.id
          ]
        );

        await client.query(
          'UPDATE inventory SET current_stock = current_stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [quantity_wasted, material_id]
        );

        await client.query('COMMIT');

        res.status(201).json({
          message: 'Material waste recorded successfully',
          waste: wasteResult.rows[0]
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Record waste error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Adjust stock (old method for compatibility)
  async adjustStock(req, res) {
    try {
      const {
        material_id,
        adjustment_type,
        quantity,
        reason,
        notes
      } = req.body;

      if (!material_id || !adjustment_type || !quantity) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        const currentStockResult = await client.query(
          'SELECT current_stock FROM inventory WHERE id = $1',
          [material_id]
        );

        if (currentStockResult.rows.length === 0) {
          throw new Error('Material not found');
        }

        const currentStock = currentStockResult.rows[0].current_stock;
        let newStock;

        if (adjustment_type === 'add') {
          newStock = currentStock + quantity;
        } else if (adjustment_type === 'remove') {
          newStock = currentStock - quantity;
        } else {
          newStock = quantity;
        }

        const adjustmentResult = await client.query(
          `INSERT INTO stock_adjustments (
            material_id, adjustment_type, quantity, previous_stock, new_stock, reason, notes, adjusted_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            material_id,
            adjustment_type,
            quantity,
            currentStock,
            newStock,
            reason,
            notes,
            req.user.id
          ]
        );

        await client.query(
          'UPDATE inventory SET current_stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [newStock, material_id]
        );

        await client.query('COMMIT');

        res.status(201).json({
          message: 'Stock adjusted successfully',
          adjustment: adjustmentResult.rows[0]
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Adjust stock error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Add stock with sheets (new method)
  async addStock(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { id } = req.params;
      const {
        reams = 0,
        sheets = 0,
        total_sheets,
        reason = 'Stock addition',
        notes
      } = req.body;

      const inventoryResult = await client.query(
        'SELECT * FROM inventory WHERE id = $1 AND is_active = true',
        [id]
      );

      if (inventoryResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      const inventoryItem = inventoryResult.rows[0];
      const sheetsPerUnit = inventoryItem.sheets_per_unit;

      let sheetsToAdd;
      if (total_sheets !== undefined) {
        sheetsToAdd = parseInt(total_sheets);
      } else {
        sheetsToAdd = SheetCalculator.toSheets(
          parseFloat(reams),
          parseInt(sheets),
          sheetsPerUnit
        );
      }

      if (sheetsToAdd <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid quantity' });
      }

      const previousSheets = inventoryItem.current_stock_sheets;
      const newSheets = previousSheets + sheetsToAdd;

      await client.query(
        'UPDATE inventory SET current_stock_sheets = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newSheets, id]
      );

      await client.query(
        `INSERT INTO stock_adjustments (
          material_id, adjustment_type, quantity, 
          previous_stock, new_stock, reason, notes, adjusted_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          'add',
          sheetsToAdd,
          previousSheets,
          newSheets,
          reason,
          notes || `Added ${sheetsToAdd} sheets (${reams} reams, ${sheets} sheets)`,
          req.user.id
        ]
      );

      const updatedResult = await client.query(
        'SELECT * FROM inventory WHERE id = $1',
        [id]
      );

      const updatedItem = updatedResult.rows[0];
      const display = SheetCalculator.toDisplay(updatedItem.current_stock_sheets, sheetsPerUnit);
      const addedDisplay = SheetCalculator.toDisplay(sheetsToAdd, sheetsPerUnit);

      await client.query('COMMIT');

      res.json({
        message: 'Stock added successfully',
        added: {
          sheets: sheetsToAdd,
          display: addedDisplay
        },
        inventory: {
          ...updatedItem,
          display_stock: display
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Add stock error:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  }

  // Record usage with sheets (new method)
  async recordUsageSheets(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        material_id,
        job_id,
        sheets_used,
        unit_cost,
        usage_type = 'production',
        notes
      } = req.body;

      if (!material_id || !sheets_used || sheets_used <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid usage data' });
      }

      const inventoryResult = await client.query(
        'SELECT * FROM inventory WHERE id = $1',
        [material_id]
      );

      if (inventoryResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Material not found' });
      }

      const inventoryItem = inventoryResult.rows[0];

      if (sheets_used > inventoryItem.current_stock_sheets) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Insufficient stock',
          available: inventoryItem.current_stock_sheets,
          needed: sheets_used
        });
      }

      const newSheets = inventoryItem.current_stock_sheets - sheets_used;
      const totalCost = sheets_used * inventoryItem.cost_per_sheet;

      await client.query(
        'UPDATE inventory SET current_stock_sheets = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newSheets, material_id]
      );

      const usageResult = await client.query(
        `INSERT INTO material_usage (
          material_id, job_id, quantity_used, quantity_sheets, unit_cost, total_cost, 
          usage_type, notes, recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          material_id,
          job_id,
          sheets_used / inventoryItem.sheets_per_unit,
          sheets_used,
          unit_cost || inventoryItem.unit_cost,
          totalCost,
          usage_type,
          notes,
          req.user.id
        ]
      );

      const stockStatus = SheetCalculator.checkStockStatus(newSheets, inventoryItem.threshold_sheets);
      
      if (stockStatus.isLow) {
        const display = SheetCalculator.toDisplay(newSheets, inventoryItem.sheets_per_unit);
        
        await notificationService.createNotification({
          title: 'Low Stock Alert',
          message: `${inventoryItem.material_name} is below threshold. ${display.display}`,
          type: 'low_stock',
          relatedEntityType: 'inventory',
          relatedEntityId: material_id,
          priority: stockStatus.priority
        });

        broadcastToAdmins({
          type: 'new_notification',
          notification: {
            title: 'Low Stock Alert',
            message: `${inventoryItem.material_name} needs restocking. ${display.display}`,
            type: 'low_stock',
            relatedEntityId: material_id,
            createdAt: new Date()
          }
        });
      }

      await client.query('COMMIT');

      const display = SheetCalculator.toDisplay(newSheets, inventoryItem.sheets_per_unit);

      res.status(201).json({
        message: 'Material usage recorded successfully',
        usage: usageResult.rows[0],
        inventory: {
          ...inventoryItem,
          current_stock_sheets: newSheets,
          display_stock: display,
          stock_status: stockStatus
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Record usage error:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  }

  // Get material history (new method)
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
      const sheetsPerUnit = inventoryItem.sheets_per_unit;

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

      const totalUsed = usageHistory.rows.reduce((sum, row) => 
        sum + (row.quantity_sheets || (row.quantity_used * sheetsPerUnit)), 0);
      
      const totalWasted = wasteHistory.rows.reduce((sum, row) => 
        sum + (row.quantity_sheets || (row.quantity_wasted * sheetsPerUnit)), 0);

      const display = SheetCalculator.toDisplay(inventoryItem.current_stock_sheets, sheetsPerUnit);
      const usedDisplay = SheetCalculator.toDisplay(totalUsed, sheetsPerUnit);
      const wastedDisplay = SheetCalculator.toDisplay(totalWasted, sheetsPerUnit);

      res.json({
        material: {
          ...inventoryItem,
          display_stock: display
        },
        history: {
          usage: usageHistory.rows,
          waste: wasteHistory.rows
        },
        totals: {
          used_sheets: totalUsed,
          wasted_sheets: totalWasted,
          total_sheets: totalUsed + totalWasted,
          display: {
            used: usedDisplay,
            wasted: wastedDisplay
          }
        }
      });
    } catch (error) {
      console.error('Get material history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Calculate sheets utility
  async calculateSheets(req, res) {
    try {
      const { reams = 0, sheets = 0, sheets_per_unit = 500 } = req.body;
      
      const totalSheets = SheetCalculator.toSheets(reams, sheets, sheets_per_unit);
      const display = SheetCalculator.toDisplay(totalSheets, sheets_per_unit);
      
      res.json({
        totalSheets,
        display: display.display,
        reams: display.reams,
        sheets: display.sheets
      });
    } catch (error) {
      console.error('Calculate sheets error:', error);
      res.status(500).json({ error: 'Calculation error' });
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
      const stockStatus = SheetCalculator.checkStockStatus(
        item.current_stock_sheets,
        item.threshold_sheets
      );
      
      res.json({
        material: item.material_name,
        currentStock: SheetCalculator.toDisplay(item.current_stock_sheets, item.sheets_per_unit),
        threshold: SheetCalculator.toDisplay(item.threshold_sheets, item.sheets_per_unit),
        status: stockStatus
      });
    } catch (error) {
      console.error('Stock check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update job materials (for job integration)
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
            const sheetsUsed = material.quantity_sheets || 
              (material.quantity * inventoryItem.sheets_per_unit);
            const newSheets = inventoryItem.current_stock_sheets - sheetsUsed;
            
            await client.query(
              'UPDATE inventory SET current_stock_sheets = $1 WHERE id = $2',
              [newSheets, material.material_id]
            );

            await client.query(
              `INSERT INTO materials_used (
                job_id, material_id, material_name, quantity, quantity_sheets,
                unit_cost, total_cost, sheets_converted
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                jobId,
                material.material_id,
                material.material_name,
                sheetsUsed / inventoryItem.sheets_per_unit,
                sheetsUsed,
                material.unit_cost || inventoryItem.unit_cost,
                sheetsUsed * inventoryItem.cost_per_sheet,
                true
              ]
            );
          }
        }
      }

      await client.query('COMMIT');
      res.json({ message: 'Job materials updated with sheet tracking' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update job materials error:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  }
}

export const inventoryController = new InventoryController();