import { pool } from '../config/database.js';

export class MaterialMonitoringController {
  // Get material usage trends
  async getMaterialUsageTrends(req, res) {
    try {
      const { period = 'month', material_id, start_date, end_date } = req.query;

      let dateFormat, groupBy;
      switch (period) {
        case 'day':
          dateFormat = 'YYYY-MM-DD';
          groupBy = 'usage_date';
          break;
        case 'week':
          dateFormat = 'IYYY-IW';
          groupBy = 'TO_CHAR(usage_date, \'IYYY-IW\')';
          break;
        case 'month':
        default:
          dateFormat = 'YYYY-MM';
          groupBy = 'TO_CHAR(usage_date, \'YYYY-MM\')';
          break;
        case 'year':
          dateFormat = 'YYYY';
          groupBy = 'TO_CHAR(usage_date, \'YYYY\')';
          break;
      }

      let query = `
        SELECT 
          ${groupBy} as period,
          i.material_name,
          i.category,
          SUM(mu.quantity_used) as total_quantity,
          SUM(mu.total_cost) as total_cost,
          AVG(mu.unit_cost) as average_unit_cost
        FROM material_usage mu
        JOIN inventory i ON mu.material_id = i.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      if (material_id) {
        paramCount++;
        query += ` AND mu.material_id = $${paramCount}`;
        params.push(material_id);
      }

      if (start_date) {
        paramCount++;
        query += ` AND mu.usage_date >= $${paramCount}`;
        params.push(start_date);
      }

      if (end_date) {
        paramCount++;
        query += ` AND mu.usage_date <= $${paramCount}`;
        params.push(end_date);
      }

      query += `
        GROUP BY ${groupBy}, i.material_name, i.category
        ORDER BY period DESC, total_cost DESC
      `;

      const result = await pool.query(query, params);
      res.json({ usage_trends: result.rows });
    } catch (error) {
      console.error('Get usage trends error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get waste analysis
  async getWasteAnalysis(req, res) {
    try {
      const { period = 'month', material_id, start_date, end_date } = req.query;

      let query = `
        SELECT 
          TO_CHAR(mw.waste_date, 'YYYY-MM') as period,
          i.material_name,
          i.category,
          mw.reason,
          SUM(mw.quantity_wasted) as total_quantity_wasted,
          SUM(mw.total_cost) as total_cost,
          COUNT(*) as waste_occurrences
        FROM material_waste mw
        JOIN inventory i ON mw.material_id = i.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      if (material_id) {
        paramCount++;
        query += ` AND mw.material_id = $${paramCount}`;
        params.push(material_id);
      }

      if (start_date) {
        paramCount++;
        query += ` AND mw.waste_date >= $${paramCount}`;
        params.push(start_date);
      }

      if (end_date) {
        paramCount++;
        query += ` AND mw.waste_date <= $${paramCount}`;
        params.push(end_date);
      }

      query += `
        GROUP BY TO_CHAR(mw.waste_date, 'YYYY-MM'), i.material_name, i.category, mw.reason
        ORDER BY total_cost DESC
      `;

      const result = await pool.query(query, params);
      res.json({ waste_analysis: result.rows });
    } catch (error) {
      console.error('Get waste analysis error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get stock levels overview
  async getStockLevels(req, res) {
    try {
      const result = await pool.query(`
        SELECT 
          material_name,
          category,
          current_stock,
          threshold,
          unit_of_measure,
          unit_cost,
          (current_stock * unit_cost) as stock_value,
          ROUND((current_stock / NULLIF(threshold, 0)) * 100, 2) as stock_percentage,
          CASE 
            WHEN current_stock <= threshold THEN 'CRITICAL'
            WHEN current_stock <= threshold * 1.5 THEN 'LOW'
            ELSE 'HEALTHY'
          END as stock_status
        FROM inventory 
        WHERE is_active = true
        ORDER BY stock_percentage ASC, stock_value DESC
      `);

      res.json({ stock_levels: result.rows });
    } catch (error) {
      console.error('Get stock levels error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get material cost analysis
  async getMaterialCostAnalysis(req, res) {
    try {
      const { period = 'month', start_date, end_date } = req.query;

      // Usage costs
      const usageCosts = await pool.query(`
        SELECT 
          TO_CHAR(usage_date, 'YYYY-MM') as period,
          SUM(total_cost) as usage_cost,
          COUNT(*) as usage_count
        FROM material_usage
        WHERE 1=1
        ${start_date ? `AND usage_date >= '${start_date}'` : ''}
        ${end_date ? `AND usage_date <= '${end_date}'` : ''}
        GROUP BY TO_CHAR(usage_date, 'YYYY-MM')
        ORDER BY period DESC
      `);

      // Waste costs
      const wasteCosts = await pool.query(`
        SELECT 
          TO_CHAR(waste_date, 'YYYY-MM') as period,
          SUM(total_cost) as waste_cost,
          COUNT(*) as waste_count
        FROM material_waste
        WHERE 1=1
        ${start_date ? `AND waste_date >= '${start_date}'` : ''}
        ${end_date ? `AND waste_date <= '${end_date}'` : ''}
        GROUP BY TO_CHAR(waste_date, 'YYYY-MM')
        ORDER BY period DESC
      `);

      // Total inventory value
      const inventoryValue = await pool.query(`
        SELECT SUM(current_stock * unit_cost) as total_inventory_value
        FROM inventory 
        WHERE is_active = true
      `);

      res.json({
        usage_costs: usageCosts.rows,
        waste_costs: wasteCosts.rows,
        total_inventory_value: inventoryValue.rows[0].total_inventory_value
      });
    } catch (error) {
      console.error('Get cost analysis error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get automatic stock updates (recent activities)
  async getAutomaticStockUpdates(req, res) {
    try {
      const { limit = 50 } = req.query;

      // Combine usage, waste, and adjustments
      const usageUpdates = await pool.query(`
        SELECT 
          'usage' as type,
          mu.created_at,
          i.material_name,
          mu.quantity_used as quantity,
          mu.unit_cost,
          mu.total_cost,
          mu.usage_type as sub_type,
          NULL as reason
        FROM material_usage mu
        JOIN inventory i ON mu.material_id = i.id
        ORDER BY mu.created_at DESC
        LIMIT $1
      `, [limit]);

      const wasteUpdates = await pool.query(`
        SELECT 
          'waste' as type,
          mw.created_at,
          i.material_name,
          mw.quantity_wasted as quantity,
          mw.unit_cost,
          mw.total_cost,
          mw.reason as sub_type,
          mw.reason
        FROM material_waste mw
        JOIN inventory i ON mw.material_id = i.id
        ORDER BY mw.created_at DESC
        LIMIT $1
      `, [limit]);

      const adjustmentUpdates = await pool.query(`
        SELECT 
          'adjustment' as type,
          sa.adjustment_date as created_at,
          i.material_name,
          sa.quantity,
          NULL as unit_cost,
          NULL as total_cost,
          sa.adjustment_type as sub_type,
          sa.reason
        FROM stock_adjustments sa
        JOIN inventory i ON sa.material_id = i.id
        ORDER BY sa.adjustment_date DESC
        LIMIT $1
      `, [limit]);

      // Combine and sort all updates
      const allUpdates = [
        ...usageUpdates.rows,
        ...wasteUpdates.rows,
        ...adjustmentUpdates.rows
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
       .slice(0, limit);

      res.json({ updates: allUpdates });
    } catch (error) {
      console.error('Get stock updates error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const materialMonitoringController = new MaterialMonitoringController();