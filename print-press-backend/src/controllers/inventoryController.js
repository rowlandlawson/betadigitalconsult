import { pool } from '../config/database.js';
import { NotificationService } from '../services/notificationService.js';
import { broadcastToAdmins } from '../websocket/notificationServer.js';

const notificationService = new NotificationService();

export class InventoryController {
  // Get all inventory items
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
        paramCount++;
        query += ` AND current_stock <= threshold`;
      }

      if (search) {
        paramCount++;
        query += ` AND (material_name ILIKE $${paramCount} OR category ILIKE $${paramCount} OR supplier ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      query += ` ORDER BY material_name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      res.json({
        inventory: result.rows,
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

  // Create inventory item
  async createInventory(req, res) {
    try {
      const {
        material_name,
        category,
        paper_size,
        paper_type,
        grammage,
        supplier,
        current_stock,
        unit_of_measure,
        unit_cost,
        selling_price,
        threshold,
        reorder_quantity
      } = req.body;

      // Validate required fields
      if (!material_name || !category || !unit_of_measure || unit_cost === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await pool.query(
        `INSERT INTO inventory (
          material_name, category, paper_size, paper_type, grammage, supplier,
          current_stock, unit_of_measure, unit_cost, selling_price, threshold, reorder_quantity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          material_name,
          category,
          paper_size,
          paper_type,
          grammage,
          supplier,
          current_stock || 0,
          unit_of_measure,
          unit_cost,
          selling_price,
          threshold || 0,
          reorder_quantity
        ]
      );

      res.status(201).json({
        message: 'Inventory item created successfully',
        item: result.rows[0]
      });
    } catch (error) {
      console.error('Create inventory error:', error);
      res.status(500).json({ error: 'Internal server error' });
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
        current_stock,
        unit_of_measure,
        unit_cost,
        selling_price,
        threshold,
        reorder_quantity,
        is_active
      } = req.body;

      const result = await pool.query(
        `UPDATE inventory 
         SET material_name = $1, category = $2, paper_size = $3, paper_type = $4, 
             grammage = $5, supplier = $6, current_stock = $7, unit_of_measure = $8,
             unit_cost = $9, selling_price = $10, threshold = $11, reorder_quantity = $12,
             is_active = $13, updated_at = CURRENT_TIMESTAMP
         WHERE id = $14
         RETURNING *`,
        [
          material_name,
          category,
          paper_size,
          paper_type,
          grammage,
          supplier,
          current_stock,
          unit_of_measure,
          unit_cost,
          selling_price,
          threshold,
          reorder_quantity,
          is_active,
          id
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      const updatedItem = result.rows[0];

      // Check for low stock and notify
      if (updatedItem.current_stock <= updatedItem.threshold) {
        await notificationService.notifyLowStock(updatedItem);
        broadcastToAdmins({
          type: 'new_notification',
          notification: {
            title: 'Low Stock Alert',
            message: `${updatedItem.material_name} is running low. Current stock: ${updatedItem.current_stock} ${updatedItem.unit_of_measure}`,
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

  // Get low stock alerts
  async getLowStockAlerts(req, res) {
    try {
      const result = await pool.query(
        `SELECT 
          id,
          material_name,
          current_stock,
          threshold,
          unit_of_measure,
          unit_cost,
          ROUND((current_stock / NULLIF(threshold, 0)) * 100, 2) as stock_percentage,
          CASE 
            WHEN current_stock <= threshold THEN 'CRITICAL'
            WHEN current_stock <= threshold * 1.5 THEN 'LOW'
            ELSE 'HEALTHY'
          END as stock_status
         FROM inventory 
         WHERE is_active = true AND current_stock <= threshold * 1.5
         ORDER BY current_stock ASC`
      );

      res.json({ low_stock_items: result.rows });
    } catch (error) {
      console.error('Get low stock error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get inventory categories
  async getCategories(req, res) {
    try {
      const result = await pool.query(
        'SELECT DISTINCT category FROM inventory WHERE is_active = true ORDER BY category'
      );

      const categories = result.rows.map(row => row.category);
      res.json({ categories });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get inventory item by ID
  async getInventoryItem(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT * FROM inventory WHERE id = $1 AND is_active = true`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      res.json({ item: result.rows[0] });
    } catch (error) {
      console.error('Get inventory item error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Record material usage
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

      // Validate required fields
      if (!material_id || !quantity_used || unit_cost === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Start transaction
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        // Record usage
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

        // Update inventory stock
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

  // Record material waste
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

      // Validate required fields
      if (!material_id || !quantity_wasted || unit_cost === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Start transaction
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        // Record waste
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

        // Update inventory stock
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

  // Adjust stock
  async adjustStock(req, res) {
    try {
      const {
        material_id,
        adjustment_type,
        quantity,
        reason,
        notes
      } = req.body;

      // Validate required fields
      if (!material_id || !adjustment_type || !quantity) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Start transaction
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        // Get current stock
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
          newStock = quantity; // For correction
        }

        // Record adjustment
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

        // Update inventory stock
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
}

export const inventoryController = new InventoryController();