// controllers/jobController.js
import { pool } from '../config/database.js';
import { NotificationService } from '../services/notificationService.js';
import { broadcastToAdmins } from '../websocket/notificationServer.js';
import { SheetCalculator } from '../utils/sheetCalculator.js';

const notificationService = new NotificationService();

// Helper function to calculate payment status
const calculatePaymentStatus = (totalCost, amountPaid) => {
  if (amountPaid >= totalCost) return 'fully_paid';
  if (amountPaid > 0) return 'partially_paid';
  return 'pending';
};

export const getAllJobs = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, worker_id, customer_id, search } = req.query;
    const offset = (page - 1) * limit;

    // --- REFACTORED FOR PERFORMANCE ---
    // Base query for filtering and counting
    let countQuery = `
      SELECT COUNT(DISTINCT j.id) as total_count
      FROM jobs j
      LEFT JOIN customers c ON j.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    // Apply filters
    if (status) {
      countQuery += ` AND j.status = $${++paramCount}`;
      params.push(status);
    }

    if (worker_id) {
      countQuery += ` AND j.worker_id = $${++paramCount}`;
      params.push(worker_id);
    }

    if (customer_id) {
      countQuery += ` AND j.customer_id = $${++paramCount}`;
      params.push(customer_id);
    }

    // Search functionality
    if (search) {
      countQuery += ` AND (
        j.ticket_id ILIKE $${paramCount} OR 
        j.description ILIKE $${paramCount} OR
        c.name ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }
    
    // For workers, only show their own jobs
    if (req.user.role === 'worker') {
      countQuery += ` AND j.worker_id = $${++paramCount}`;
      params.push(req.user.userId);
    }

    // Get total count first
    const totalResult = await pool.query(countQuery, params);
    const totalCount = parseInt(totalResult.rows[0]?.total_count || 0);

    // We need to re-apply filters to the outer query if they exist
    // This is a simplified example; a more complex refactor might be needed
    // For now, we'll assume the LIMIT/OFFSET subquery is sufficient for most cases
    // and the main performance gain comes from that.
    
    // A more robust way is to get IDs from the filtered query first
    const paginatedIdsQuery = countQuery.replace('COUNT(DISTINCT j.id) as total_count', 'j.id') + 
      ` ORDER BY j.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    
    const paginatedIdsResult = await pool.query(paginatedIdsQuery, [...params, parseInt(limit), offset]);
    const jobIds = paginatedIdsResult.rows.map(r => r.id);

    if (jobIds.length === 0) {
      return res.json({ jobs: [], pagination: { page: parseInt(page), limit: parseInt(limit), total: totalCount, totalPages: Math.ceil(totalCount / parseInt(limit)) } });
    }

    // The original mainQuery has a complex subquery for pagination that is replaced.
    // We need to construct the final query by joining with the paginated IDs.
    const finalQuery = `
      SELECT j.*, c.name as customer_name, c.phone as customer_phone, c.total_jobs_count, u.name as worker_name,
             COALESCE(p_sum.amount_paid, 0) as amount_paid,
             (j.total_cost - COALESCE(p_sum.amount_paid, 0)) as balance,
             CASE 
               WHEN COALESCE(p_sum.amount_paid, 0) >= j.total_cost THEN 'fully_paid'
               WHEN COALESCE(p_sum.amount_paid, 0) > 0 THEN 'partially_paid'
               ELSE 'pending'
             END as payment_status
      FROM jobs j
      JOIN unnest($1::uuid[]) WITH ORDINALITY t(id, ord) ON j.id = t.id
      LEFT JOIN customers c ON j.customer_id = c.id
      LEFT JOIN users u ON j.worker_id = u.id
      LEFT JOIN (SELECT job_id, SUM(amount) as amount_paid FROM payments GROUP BY job_id) p_sum ON j.id = p_sum.job_id
      ORDER BY t.ord;`;
    const result = await pool.query(finalQuery, [jobIds]);

    const jobs = result.rows.map(row => ({
      ...row,
      amount_paid: parseFloat(row.amount_paid),
      balance: parseFloat(row.balance)
    }));

    res.json({
      jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    // First, get the job with customer and worker info
    const jobResult = await pool.query(`
      SELECT 
        j.*,
        c.name as customer_name,
        c.phone as customer_phone,
        c.email as customer_email,
        c.total_jobs_count,
        u.name as worker_name
      FROM jobs j
      LEFT JOIN customers c ON j.customer_id = c.id
      LEFT JOIN users u ON j.worker_id = u.id
      WHERE j.id = $1
    `, [id]);

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const jobRow = jobResult.rows[0];

    // Get payment summary separately
    const paymentSummaryResult = await pool.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as amount_paid
      FROM payments
      WHERE job_id = $1
    `, [id]);

    const amountPaid = parseFloat(paymentSummaryResult.rows[0]?.amount_paid || 0);
    const balance = parseFloat(jobRow.total_cost) - amountPaid;
    
    const paymentStatus = amountPaid >= parseFloat(jobRow.total_cost) 
      ? 'fully_paid' 
      : amountPaid > 0 
      ? 'partially_paid' 
      : 'pending';

    const job = {
      ...jobRow,
      amount_paid: amountPaid,
      balance: balance,
      payment_status: paymentStatus
    };

    // Check if worker has access to this job
    if (req.user.role === 'worker' && job.worker_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get materials used
    const materialsResult = await pool.query(
      `SELECT 
         mu.*,
         i.current_stock,
         (i.attributes->>'sheets_per_unit')::integer as sheets_per_unit
       FROM materials_used mu
       LEFT JOIN inventory i ON mu.material_id = i.id
       WHERE mu.job_id = $1`,
      [id]
    );

    // Get waste expenses
    const wasteResult = await pool.query(
      'SELECT * FROM waste_expenses WHERE job_id = $1',
      [id]
    );

    // Get payments
    const paymentsResult = await pool.query(
      `SELECT 
        id, 
        amount, 
        date as payment_date,
        payment_method,
        payment_type,
        created_at
       FROM payments WHERE job_id = $1 ORDER BY date DESC`,
      [id]
    );

    res.json({
      job,
      materials: materialsResult.rows,
      waste: wasteResult.rows,
      payments: paymentsResult.rows
    });
  } catch (error) {
    console.error('Get job error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { 
        detail: error.detail,
        stack: error.stack 
      })
    });
  }
};

export const createJob = async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🚀 [CreateJob] Payload:', req.body);

    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    await client.query('BEGIN');

    const {
      customer_id,
      customer_name,
      customer_phone,
      customer_email,
      description,
      total_cost,
      date_requested,
      delivery_deadline
    } = req.body;

    // Validation
    if (!customer_name || !customer_phone || !description || !total_cost) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate Ticket ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    const ticketId = `PRESS-${timestamp}-${random}`;

    let finalCustomerId = null;

    // 1. Check if specific Customer ID provided
    if (customer_id && typeof customer_id === 'string' && customer_id.trim().length > 0) {
      const customerResult = await client.query(
        'SELECT id FROM customers WHERE id = $1',
        [customer_id]
      );

      if (customerResult.rows.length > 0) {
        finalCustomerId = customerResult.rows[0].id;
        await client.query(
          'UPDATE customers SET last_interaction_date = CURRENT_TIMESTAMP WHERE id = $1',
          [finalCustomerId]
        );
      }
    }

    // 2. If no ID, find by phone or create new
    if (!finalCustomerId) {
      const cleanPhone = customer_phone.trim();
      const cleanEmail = customer_email ? customer_email.trim() : null;

      let customerResult = await client.query(
        'SELECT id FROM customers WHERE phone = $1',
        [cleanPhone]
      );

      if (customerResult.rows.length > 0) {
        finalCustomerId = customerResult.rows[0].id;
        // Update customer last interaction
        await client.query(
          'UPDATE customers SET last_interaction_date = CURRENT_TIMESTAMP WHERE id = $1',
          [finalCustomerId]
        );
      } else {
        // Create new customer (will trigger Error 23505 if email exists, which frontend will now catch)
        customerResult = await client.query(
          `INSERT INTO customers (name, phone, email) 
           VALUES ($1, $2, $3) 
           RETURNING id`,
          [customer_name, cleanPhone, cleanEmail]
        );
        finalCustomerId = customerResult.rows[0].id;
      }
    }

    // 3. CRITICAL FIX: Sanitize Dates (Prevent crash on empty string)
    const dbDeliveryDeadline = (delivery_deadline && delivery_deadline !== '') ? delivery_deadline : null;
    const dbDateRequested = (date_requested && date_requested !== '') ? date_requested : new Date();

    // 4. Create Job
    const jobResult = await client.query(
      `INSERT INTO jobs (
        ticket_id, customer_id, worker_id, description, total_cost, 
        date_requested, delivery_deadline, balance, payment_status, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'not_started')
      RETURNING *`,
      [
        ticketId,
        finalCustomerId,
        req.user.userId,
        description,
        total_cost,
        dbDateRequested,
        dbDeliveryDeadline,
        total_cost, // Initial balance
        'pending' // Initial status
      ]
    );

    const job = jobResult.rows[0];

    // 5. Update Customer Stats
    await client.query(
      `UPDATE customers 
       SET total_jobs_count = total_jobs_count + 1,
           total_amount_spent = total_amount_spent + $1,
           last_interaction_date = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [total_cost, finalCustomerId]
    );

    // 6. Notifications
    try {
      if (notificationService) {
        await notificationService.notifyNewJob(job, req.user);
        broadcastToAdmins({
          type: 'new_notification',
          notification: {
            title: 'New Job Created',
            message: `New job ${job.ticket_id} created by ${req.user.name} for ${customer_name}`,
            type: 'new_job',
            relatedEntityId: job.id,
            createdAt: new Date()
          }
        });
      }
    } catch (e) { console.log('Notification error ignored'); }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Job created successfully',
      job
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Create job error:', error);
    
    // UPDATED: Return specific Postgres error details (like duplicates) to frontend
    res.status(500).json({ 
      error: 'Database Error', 
      message: error.message,
      code: error.code,
      detail: error.detail
    });
  } finally {
    client.release();
  }
};

export const updateJobStatus = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { status, materials, waste, expenses } = req.body;

    // Get current job status
    const currentJob = await client.query(
      'SELECT status, worker_id, ticket_id FROM jobs WHERE id = $1',
      [id]
    );

    if (currentJob.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check access
    if (req.user.role === 'worker' && currentJob.rows[0].worker_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const oldStatus = currentJob.rows[0].status;
    const jobTicketId = currentJob.rows[0].ticket_id;

    // Update job status
    await client.query(
      'UPDATE jobs SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, id]
    );

    // Record materials used if provided
    if (materials && Array.isArray(materials)) {
      for (const material of materials) {
        // Get inventory item
        let materialId = null;
        let inventoryItem = null;
        
        if (material.material_name) {
          const invResult = await client.query(
            'SELECT *, (attributes->>\'sheets_per_unit\')::integer as sheets_per_unit FROM inventory WHERE material_name ILIKE $1 AND is_active = true LIMIT 1',
            [`%${material.material_name}%`]
          );
          
          if (invResult.rows.length > 0) {
            inventoryItem = invResult.rows[0];
            materialId = inventoryItem.id;
          }
        }

        // Calculate sheets used
        // For paper items, prioritize quantity_sheets if provided
        // Otherwise, check if quantity needs conversion based on unit_of_measure
        const sheetsPerUnit = inventoryItem?.sheets_per_unit || (inventoryItem?.attributes?.sheets_per_unit ? parseInt(inventoryItem.attributes.sheets_per_unit) : 500);
        let sheetsUsed;
        if (inventoryItem?.category === 'Paper') {
          if (material.quantity_sheets !== undefined && material.quantity_sheets !== null) {
            sheetsUsed = material.quantity_sheets;
          } else {
            const unitOfMeasure = inventoryItem?.unit_of_measure || '';
            // If unit_of_measure contains "ream", convert reams to sheets
            if (unitOfMeasure.toLowerCase().includes('ream')) {
              sheetsUsed = (material.quantity || 0) * sheetsPerUnit;
            } else {
              // Assume quantity is already in sheets
              sheetsUsed = material.quantity || 0;
            }
          }
        } else {
          // For non-paper items, use quantity_sheets if provided, otherwise use quantity
          sheetsUsed = material.quantity_sheets || material.quantity || 0;
        }

        // --- FIX: Use authoritative cost from inventory if item is found ---
        let finalUnitCost = material.unit_cost;
        let finalTotalCost = material.total_cost;

        if (inventoryItem) {
          finalUnitCost = inventoryItem.unit_cost;
          // For paper items, calculate cost per sheet; for others, use unit_cost directly
          if (inventoryItem.category === 'Paper') {
            const costPerSheet = inventoryItem.cost_per_sheet || (inventoryItem.unit_cost / sheetsPerUnit);
            finalTotalCost = sheetsUsed * costPerSheet;
          } else {
            finalTotalCost = sheetsUsed * inventoryItem.unit_cost;
          }
        }

        // Always record material usage
        // Calculate quantity in units (for display/storage)
        let quantityInUnits;
        if (inventoryItem?.category === 'Paper') {
          quantityInUnits = material.quantity || (sheetsUsed / sheetsPerUnit);
        } else {
          quantityInUnits = material.quantity || sheetsUsed;
        }
        
        const materialUsedResult = await client.query(
          `INSERT INTO materials_used (
            job_id, material_id, material_name, quantity,
            quantity_sheets, unit_cost, total_cost, sheets_converted
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            id,
            materialId,
            material.material_name,
            quantityInUnits,
            inventoryItem?.category === 'Paper' ? sheetsUsed : null,
            finalUnitCost,
            finalTotalCost,
            !!inventoryItem && inventoryItem.category === 'Paper'
          ]
        );

        // Update inventory if material exists
        if (materialId && inventoryItem) {
          // Get current stock (now stored as current_stock, but still represents sheets for paper items)
          const currentStockSheets = parseFloat(inventoryItem.current_stock) || 0;
          
          // Check stock
          if (sheetsUsed > currentStockSheets) {
            // Insufficient stock - log warning but continue
            console.warn(`Insufficient stock for ${inventoryItem.material_name}. Need: ${sheetsUsed}, Have: ${currentStockSheets}`);
            
            // Option 1: Use what's available
            const actualSheetsUsed = Math.min(sheetsUsed, currentStockSheets);
            const newSheets = currentStockSheets - actualSheetsUsed;
            
            await client.query(
              'UPDATE inventory SET current_stock = $1 WHERE id = $2',
              [newSheets, materialId]
            );
            
            // Update materials_used with actual used
            await client.query(
              'UPDATE materials_used SET quantity_sheets = $1 WHERE id = $2',
              [actualSheetsUsed, materialUsedResult.rows[0].id]
            );
            
            // Send urgent notification
            await notificationService.createNotification({
              title: 'Stock Shortage',
              message: `${inventoryItem.material_name} had insufficient stock. Used ${actualSheetsUsed} of ${sheetsUsed} requested sheets.`,
              type: 'system',
              priority: 'high'
            });
          } else {
            // Normal case - enough stock
            const newSheets = currentStockSheets - sheetsUsed;
            
            await client.query(
              'UPDATE inventory SET current_stock = $1 WHERE id = $2',
              [newSheets, materialId]
            );
          }

          // Record in material_usage table
          // Calculate quantity_used in units
          let quantityUsedInUnits;
          if (inventoryItem.category === 'Paper') {
            quantityUsedInUnits = sheetsUsed / sheetsPerUnit;
          } else {
            quantityUsedInUnits = sheetsUsed;
          }
          
          // Calculate total cost
          let totalCostForUsage;
          if (inventoryItem.category === 'Paper') {
            const costPerSheet = inventoryItem.cost_per_sheet || (inventoryItem.unit_cost / sheetsPerUnit);
            totalCostForUsage = sheetsUsed * costPerSheet;
          } else {
            totalCostForUsage = sheetsUsed * inventoryItem.unit_cost;
          }
          
          await client.query(
            `INSERT INTO material_usage (
              material_id, job_id, quantity_used, quantity_sheets, unit_cost, total_cost,
              usage_date, usage_type, notes, recorded_by
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'production', $7, $8)`,
            [
              materialId,
              id,
              quantityUsedInUnits,
              inventoryItem.category === 'Paper' ? sheetsUsed : null,
              material.unit_cost || inventoryItem.unit_cost,
              totalCostForUsage,
              `Job ${jobTicketId}`,
              req.user.userId
            ]
          );

          // Check stock status
          const updatedInv = await client.query(
            'SELECT *, (attributes->>\'sheets_per_unit\')::integer as sheets_per_unit FROM inventory WHERE id = $1',
            [materialId]
          );
          
          if (updatedInv.rows.length > 0) {
            const updatedItem = updatedInv.rows[0];
            const currentStockSheets = parseFloat(updatedItem.current_stock) || 0;
            const thresholdSheets = parseFloat(updatedItem.threshold) || 0;
            const sheetsPerUnit = updatedItem.sheets_per_unit || 500;
            
            const stockStatus = SheetCalculator.checkStockStatus(
              currentStockSheets,
              thresholdSheets
            );
            
            if (stockStatus.isLow) {
              const display = SheetCalculator.toDisplay(
                currentStockSheets,
                sheetsPerUnit
              );
              
              await notificationService.createNotification({
                title: 'Low Stock Alert',
                message: `${updatedItem.material_name} is below threshold. ${display.display}`,
                type: 'low_stock',
                relatedEntityType: 'inventory',
                relatedEntityId: materialId,
                priority: stockStatus.priority
              });
            }
          }
        }
      }
    }

    // Record waste if provided
    if (waste && Array.isArray(waste)) {
      for (const wasteItem of waste) {
        let materialId = null;
        let inventoryItem = null; 

        if (wasteItem.material_id) {
          materialId = wasteItem.material_id;
          const invResult = await client.query(
            'SELECT * FROM inventory WHERE id = $1',
            [materialId]
          );
          if (invResult.rows.length > 0) {
            inventoryItem = invResult.rows[0];
          }
        } else if (wasteItem.material_name) {
          const invResult = await client.query(
            'SELECT * FROM inventory WHERE material_name = $1 LIMIT 1',
            [wasteItem.material_name]
          );
          if (invResult.rows.length > 0) {
            inventoryItem = invResult.rows[0];
            materialId = inventoryItem.id;
          }
        }

        await client.query(
          `INSERT INTO waste_expenses (job_id, material_id, type, description, quantity, unit_cost, total_cost, waste_reason)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            id,
            materialId,
            wasteItem.type,
            wasteItem.description,
            wasteItem.quantity || null,
            wasteItem.unit_cost || null,
            wasteItem.total_cost,
            wasteItem.waste_reason || null
          ]
        );

        if (inventoryItem && wasteItem.quantity > 0) {
            const isPaper = inventoryItem.category === 'Paper';
            const attributes = inventoryItem.attributes || {};
            const sheetsPerUnit = parseInt(attributes.sheets_per_unit) || 500;
            const unitOfMeasure = (inventoryItem.unit_of_measure || '').toLowerCase();
            let quantityToSubtract = wasteItem.quantity;

            if (isPaper) {
                if (unitOfMeasure.includes('ream')) {
                  quantityToSubtract = wasteItem.quantity * sheetsPerUnit;
                }
            }
            
          const currentStock = parseFloat(inventoryItem.current_stock) || 0;
          let newStock = currentStock - quantityToSubtract;
          if (newStock < 0) {
            console.warn(`Insufficient stock for ${inventoryItem.material_name} to cover waste. Adjusting to 0.`);
            newStock = 0;
          }

          await client.query(
            `UPDATE inventory 
             SET current_stock = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2`,
            [
              newStock,
              inventoryItem.id
            ]
          );
        }
      }
    }

    // Record operational expenses if provided
    if (expenses && Array.isArray(expenses)) {
      for (const expense of expenses) {
        await client.query(
          `INSERT INTO operational_expenses (description, category, amount, expense_date, receipt_number, notes, recorded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            expense.description,
            expense.category,
            expense.amount,
            expense.expense_date,
            expense.receipt_number || null,
            expense.notes || null,
            req.user.userId
          ]
        );
      }
    }

    // Notify admins about status change and material/expense updates
    const job = { 
      id, 
      ticket_id: jobTicketId,
      status 
    };

    if (oldStatus !== status) {
      await notificationService.notifyStatusChange(job, oldStatus, status, req.user);
      broadcastToAdmins({
        type: 'new_notification',
        notification: {
          title: 'Job Status Updated',
          message: `Job ${job.ticket_id} status changed from ${oldStatus} to ${status} by ${req.user.name}`,
          type: 'status_change',
          relatedEntityId: id,
          createdAt: new Date()
        }
      });
    }

    // Notify about materials/expenses updates
    if (materials && materials.length > 0) {
      broadcastToAdmins({
        type: 'new_notification',
        notification: {
          title: 'Job Materials Updated',
          message: `${materials.length} material(s) recorded for job ${job.ticket_id} by ${req.user.name}`,
          type: 'status_change',
          relatedEntityId: id,
          createdAt: new Date()
        }
      });
    }

    if (expenses && expenses.length > 0) {
      broadcastToAdmins({
        type: 'new_notification',
        notification: {
          title: 'Operational Expenses Recorded',
          message: `${expenses.length} expense(s) recorded for job ${job.ticket_id} by ${req.user.name}`,
          type: 'status_change',
          relatedEntityId: id,
          createdAt: new Date()
        }
      });
    }

    await client.query('COMMIT');

    res.json({ message: 'Job status updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update job status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const getJobByTicketId = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const result = await pool.query(`
      SELECT 
        j.*,
        c.name as customer_name,
        c.phone as customer_phone,
        c.total_jobs_count,
        u.name as worker_name,
        COALESCE(SUM(p.amount), 0) as amount_paid,
        (j.total_cost - COALESCE(SUM(p.amount), 0)) as balance,
        CASE 
          WHEN COALESCE(SUM(p.amount), 0) >= j.total_cost THEN 'fully_paid'
          WHEN COALESCE(SUM(p.amount), 0) > 0 THEN 'partially_paid'
          ELSE 'pending'
        END as payment_status,
        json_agg(
          DISTINCT jsonb_build_object(
            'id', p.id,
            'amount', p.amount,
            'payment_date', p.date,
            'payment_method', p.payment_method,
            'created_at', p.created_at
          )
        ) as payments
      FROM jobs j
      LEFT JOIN customers c ON j.customer_id = c.id
      LEFT JOIN users u ON j.worker_id = u.id
      LEFT JOIN payments p ON j.id = p.job_id
      WHERE j.ticket_id = $1
      GROUP BY j.id, c.name, c.phone, c.total_jobs_count, u.name
    `, [ticketId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = {
      ...result.rows[0],
      amount_paid: parseFloat(result.rows[0].amount_paid),
      balance: parseFloat(result.rows[0].balance)
    };

    res.json({ job });
  } catch (error) {
    console.error('Get job by ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateJob = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      description,
      total_cost,
      delivery_deadline,
      mode_of_payment
    } = req.body;

    // Check if job exists and user has access
    const currentJob = await client.query(
      'SELECT worker_id, total_cost, balance FROM jobs WHERE id = $1',
      [id]
    );

    if (currentJob.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (req.user.role === 'worker' && currentJob.rows[0].worker_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate new balance if total_cost changed
    const oldTotalCost = parseFloat(currentJob.rows[0].total_cost);
    const currentBalance = parseFloat(currentJob.rows[0].balance);
    const amountPaid = oldTotalCost - currentBalance;
    const newBalance = total_cost - amountPaid;

    // Calculate new payment status
    const newPaymentStatus = calculatePaymentStatus(total_cost, amountPaid);

    const result = await client.query(
      `UPDATE jobs 
       SET description = $1, total_cost = $2, delivery_deadline = $3, 
           mode_of_payment = $4, balance = $5, payment_status = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [description, total_cost, delivery_deadline, mode_of_payment, newBalance, newPaymentStatus, id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Job updated successfully',
      job: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

// Get material edit history for a job
export const getMaterialEditHistory = async (req, res) => {
  try {
    const { jobId } = req.params;

    const result = await pool.query(`
      SELECT 
        meh.*,
        u.name as editor_name,
        mu.material_name as current_material_name
      FROM material_edit_history meh
      LEFT JOIN users u ON meh.edited_by = u.id
      LEFT JOIN materials_used mu ON meh.material_used_id = mu.id
      WHERE meh.job_id = $1
      ORDER BY meh.edited_at DESC
    `, [jobId]);

    res.json({ editHistory: result.rows });
  } catch (error) {
    console.error('Get material edit history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update materials with edit tracking
export const updateJobMaterials = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { jobId } = req.params;
    const { materials, waste, expenses, edit_reason } = req.body;
    const userId = req.user.userId;

    if (!edit_reason || edit_reason.trim().length < 5) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Edit reason is required and must be at least 5 characters long' 
      });
    }

    // Verify job exists and user has access
    const jobCheck = await client.query(
      `SELECT j.*, u.name as worker_name 
       FROM jobs j 
       LEFT JOIN users u ON j.worker_id = u.id 
       WHERE j.id = $1`,
      [jobId]
    );

    if (jobCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobCheck.rows[0];
    const jobTicketId = job.ticket_id;

    // Check access - workers can only edit their own jobs, admins can edit all
    if (req.user.role === 'worker' && job.worker_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get current materials for comparison
    const currentMaterials = await client.query(
      'SELECT mu.*, i.category FROM materials_used mu LEFT JOIN inventory i ON mu.material_id = i.id WHERE mu.job_id = $1',
      [jobId]
    );

    const currentMaterialsMap = new Map();
    currentMaterials.rows.forEach(material => {
      currentMaterialsMap.set(material.id, material);
    });

    // Process material updates
    for (const material of materials) {
      let inventoryItem = null;
      if (material.material_id) {
        const invResult = await client.query('SELECT * FROM inventory WHERE id = $1', [material.material_id]);
        if (invResult.rows.length > 0) {
          inventoryItem = invResult.rows[0];
        }
      }

      const isPaper = inventoryItem?.category === 'Paper';
      const sheetsPerUnit = parseInt(inventoryItem?.attributes?.sheets_per_unit) || 500;
      // For paper items, prioritize quantity_sheets if provided, otherwise convert quantity to sheets
      // For non-paper items, use quantity_sheets if provided, otherwise use quantity as-is
      let quantitySheets;
      if (isPaper) {
        if (material.quantity_sheets !== undefined && material.quantity_sheets !== null) {
          quantitySheets = material.quantity_sheets;
        } else {
          // If quantity_sheets not provided, assume quantity is in sheets (for backward compatibility)
          // But if unit_of_measure suggests reams, convert
          const unitOfMeasure = inventoryItem?.unit_of_measure || '';
          if (unitOfMeasure.toLowerCase().includes('ream')) {
            quantitySheets = (material.quantity || 0) * sheetsPerUnit;
          } else {
            quantitySheets = material.quantity || 0;
          }
        }
      } else {
        quantitySheets = material.quantity_sheets || (material.quantity || 0);
      }

      if (material.id) {
        // Update existing material
        const currentMaterial = currentMaterialsMap.get(material.id);
        
        if (currentMaterial) {
          const isOldPaper = currentMaterial.category === 'Paper';
          const oldQuantitySheets = (isOldPaper ? currentMaterial.quantity_sheets : (currentMaterial.quantity_sheets || (currentMaterial.quantity * sheetsPerUnit))) || 0;
          const quantityChange = quantitySheets - oldQuantitySheets;

          // Check if any changes were made
          const hasChanges = 
            currentMaterial.material_name !== material.material_name ||
            currentMaterial.paper_size !== material.paper_size ||
            currentMaterial.paper_type !== material.paper_type ||
            currentMaterial.grammage !== material.grammage ||
            parseFloat(currentMaterial.quantity) !== parseFloat(material.quantity) ||
            parseFloat(currentMaterial.unit_cost) !== parseFloat(material.unit_cost) ||
            parseFloat(currentMaterial.total_cost) !== parseFloat(material.total_cost);

          if (hasChanges) {
            // Record edit history
            await client.query(
              `INSERT INTO material_edit_history (
                material_used_id, job_id,
                previous_material_name, previous_paper_size, previous_paper_type, 
                previous_grammage, previous_quantity, previous_unit_cost, previous_total_cost,
                new_material_name, new_paper_size, new_paper_type, 
                new_grammage, new_quantity, new_unit_cost, new_total_cost,
                edit_reason, edited_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
              [
                material.id, jobId,
                currentMaterial.material_name, currentMaterial.paper_size, 
                currentMaterial.paper_type, currentMaterial.grammage,
                currentMaterial.quantity, currentMaterial.unit_cost, currentMaterial.total_cost,
                material.material_name, material.paper_size, material.paper_type,
                material.grammage, material.quantity, material.unit_cost, material.total_cost,
                edit_reason.trim(), userId
              ]
            );

            // Update the material
            await client.query(
              `UPDATE materials_used 
               SET material_name = $1, paper_size = $2, paper_type = $3, 
                   grammage = $4, quantity = $5, unit_cost = $6, total_cost = $7,
                   quantity_sheets = $8, updated_at = CURRENT_TIMESTAMP
               WHERE id = $9 AND job_id = $10`,
              [
                material.material_name,
                material.paper_size || null,
                material.paper_type || null,
                material.grammage || null,
                material.quantity,
                material.unit_cost,
                material.total_cost || (material.quantity * material.unit_cost),
                quantitySheets,
                material.id,
                jobId
              ]
            );

            // Update inventory if material_id is present
            // quantityChange is in sheets for paper items, so we can use it directly
            if(currentMaterial.material_id) {
              const currentStock = parseFloat(inventoryItem?.current_stock) || 0;
              const newStock = currentStock - quantityChange;
              
              if (newStock < 0) {
                console.warn(`Insufficient stock for ${inventoryItem?.material_name}. Adjusting to 0.`);
                await client.query(
                  `UPDATE inventory SET current_stock = 0 WHERE id = $1`,
                  [currentMaterial.material_id]
                );
              } else {
                await client.query(
                  `UPDATE inventory SET current_stock = $1 WHERE id = $2`,
                  [newStock, currentMaterial.material_id]
                );
              }
            }
          }
        }
      } else {
        // Add new material
        const newMaterialResult = await client.query(
          `INSERT INTO materials_used (
            job_id, material_name, paper_size, paper_type, grammage, 
            quantity, unit_cost, total_cost, quantity_sheets, material_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *`,
          [
            jobId,
            material.material_name,
            material.paper_size || null,
            material.paper_type || null,
            material.grammage || null,
            material.quantity,
            material.unit_cost,
            material.total_cost || (material.quantity * material.unit_cost),
            quantitySheets,
            material.material_id || null
          ]
        );

        const newMaterial = newMaterialResult.rows[0];

        // Record addition in edit history
        await client.query(
          `INSERT INTO material_edit_history (
            material_used_id, job_id,
            previous_material_name, previous_paper_size, previous_paper_type, 
            previous_grammage, previous_quantity, previous_unit_cost, previous_total_cost,
            new_material_name, new_paper_size, new_paper_type, 
            new_grammage, new_quantity, new_unit_cost, new_total_cost,
            edit_reason, edited_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
          [
            newMaterial.id, jobId,
            null, null, null, null, null, null, null, // All nulls for previous values indicates addition
            material.material_name, material.paper_size, material.paper_type,
            material.grammage, material.quantity, material.unit_cost, material.total_cost,
            `${edit_reason} (New material added)`, userId
          ]
        );

        // Update inventory if material_id is present
        if (material.material_id && inventoryItem) {
          const currentStock = parseFloat(inventoryItem.current_stock) || 0;
          const newStock = currentStock - quantitySheets;
          
          if (newStock < 0) {
            console.warn(`Insufficient stock for ${inventoryItem.material_name}. Adjusting to 0.`);
            await client.query(
              `UPDATE inventory SET current_stock = 0 WHERE id = $1`,
              [material.material_id]
            );
          } else {
            await client.query(
              `UPDATE inventory SET current_stock = $1 WHERE id = $2`,
              [newStock, material.material_id]
            );
          }
        }
      }
    }

    // Handle material deletions
    const updatedMaterialIds = materials.map(m => m.id).filter(Boolean);
    const materialsToDelete = currentMaterials.rows.filter(
      m => !updatedMaterialIds.includes(m.id)
    );

    for (const materialToDelete of materialsToDelete) {
      // Record deletion in edit history
      await client.query(
        `INSERT INTO material_edit_history (
          material_used_id, job_id,
          previous_material_name, previous_paper_size, previous_paper_type, 
          previous_grammage, previous_quantity, previous_unit_cost, previous_total_cost,
          new_material_name, new_paper_size, new_paper_type, 
          new_grammage, new_quantity, new_unit_cost, new_total_cost,
          edit_reason, edited_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          materialToDelete.id, jobId,
          materialToDelete.material_name, materialToDelete.paper_size, 
          materialToDelete.paper_type, materialToDelete.grammage,
          materialToDelete.quantity, materialToDelete.unit_cost, materialToDelete.total_cost,
          null, null, null, null, null, null, null, // All nulls indicate deletion
          `${edit_reason} (Material deleted)`, userId
        ]
      );

      // Return stock to inventory if the deleted material was linked to an inventory item
      if (materialToDelete.material_id) {
        const sheetsToReturn = materialToDelete.quantity_sheets || 0;
        await client.query(
          `UPDATE inventory SET current_stock = current_stock + $1 WHERE id = $2`,
          [sheetsToReturn, materialToDelete.material_id]
        );
      }

      // Delete the material
      await client.query(
        'DELETE FROM materials_used WHERE id = $1',
        [materialToDelete.id]
      );
    }

    // Handle waste if provided
    if (waste && Array.isArray(waste)) {
      for (const wasteItem of waste) {
        let materialId = null;
        let inventoryItem = null;

        if (wasteItem.material_id) {
          materialId = wasteItem.material_id;
        } else if (wasteItem.material_name) {
          const invResult = await client.query(
            'SELECT * FROM inventory WHERE material_name = $1 LIMIT 1',
            [wasteItem.material_name]
          );
          if (invResult.rows.length > 0) {
            inventoryItem = invResult.rows[0];
            materialId = inventoryItem.id;
          }
        }

        // If we only have an id, fetch the inventory item
        if (!inventoryItem && materialId) {
          const invById = await client.query(
            'SELECT * FROM inventory WHERE id = $1',
            [materialId]
          );
          if (invById.rows.length > 0) {
            inventoryItem = invById.rows[0];
          }
        }

        // Derive unit_cost and total_cost from inventory when missing
        let unitCost = wasteItem.unit_cost;
        let totalCost = wasteItem.total_cost;
        let quantityForInventory = wasteItem.quantity || 0;

        if (inventoryItem) {
          const isPaper = inventoryItem.category === 'Paper';
          const attributes = inventoryItem.attributes || {};
          const sheetsPerUnit = parseInt(attributes.sheets_per_unit) || 500;
          const unitOfMeasure = (inventoryItem.unit_of_measure || '').toLowerCase();

          if (isPaper) {
            // Convert to sheets for stock tracking
            if (unitOfMeasure.includes('ream')) {
              quantityForInventory = (wasteItem.quantity || 0) * sheetsPerUnit;
            } else {
              quantityForInventory = wasteItem.quantity || 0;
            }

            const costPerSheet = parseFloat(inventoryItem.unit_cost) / sheetsPerUnit;
            if (unitCost == null) {
              unitCost = inventoryItem.unit_cost;
            }
            if (totalCost == null && quantityForInventory > 0) {
              totalCost = quantityForInventory * costPerSheet;
            }
          } else {
            quantityForInventory = wasteItem.quantity || 0;
            if (unitCost == null) {
              unitCost = inventoryItem.unit_cost;
            }
            if (totalCost == null && quantityForInventory > 0) {
              totalCost = quantityForInventory * parseFloat(inventoryItem.unit_cost);
            }
          }
        } else {
          // Fallback if we don't have inventory details
          if (unitCost == null) unitCost = wasteItem.unit_cost || 0;
          if (totalCost == null && quantityForInventory && unitCost) {
            totalCost = quantityForInventory * unitCost;
          }
        }

        if (wasteItem.id) {
          // Update existing waste
          await client.query(
            `UPDATE waste_expenses 
             SET material_id = $1, type = $2, description = $3, quantity = $4, 
                 unit_cost = $5, total_cost = $6, waste_reason = $7
             WHERE id = $8 AND job_id = $9`,
            [
              materialId,
              wasteItem.type,
              wasteItem.description,
              wasteItem.quantity || null,
              unitCost || null,
              totalCost,
              wasteItem.waste_reason || null,
              wasteItem.id,
              jobId
            ]
          );
        } else {
          // Insert new waste
          await client.query(
            `INSERT INTO waste_expenses (job_id, material_id, type, description, quantity, unit_cost, total_cost, waste_reason)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              jobId,
              materialId,
              wasteItem.type,
              wasteItem.description,
              wasteItem.quantity || null,
              unitCost || null,
              totalCost,
              wasteItem.waste_reason || null
            ]
          );

          // For new waste records, also subtract from inventory stock
          if (inventoryItem && quantityForInventory > 0) {
            const currentStock = parseFloat(inventoryItem.current_stock) || 0;
            let newStock = currentStock - quantityForInventory;
            if (newStock < 0) {
              newStock = 0;
            }

            await client.query(
              `UPDATE inventory 
               SET current_stock = $1, updated_at = CURRENT_TIMESTAMP 
               WHERE id = $2`,
              [
                newStock,
                inventoryItem.id
              ]
            );
          }
        }
      }
    }

    // Handle operational expenses if provided
    if (expenses && Array.isArray(expenses)) {
      for (const expense of expenses) {
        if (expense.id) {
          // Update existing expense
          await client.query(
            `UPDATE operational_expenses 
             SET description = $1, category = $2, amount = $3, expense_date = $4, 
                 receipt_number = $5, notes = $6
             WHERE id = $7`,
            [
              expense.description,
              expense.category,
              expense.amount,
              expense.expense_date,
              expense.receipt_number || null,
              expense.notes || null,
              expense.id
            ]
          );
        } else {
          // Insert new expense (link to job via notes or create a job_expenses table)
          // For now, we'll add job_id to notes or create a separate linking mechanism
          const notesWithJob = expense.notes 
            ? `${expense.notes} [Job: ${jobTicketId}]`
            : `[Job: ${jobTicketId}]`;
          
          await client.query(
            `INSERT INTO operational_expenses (description, category, amount, expense_date, receipt_number, notes, recorded_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              expense.description,
              expense.category,
              expense.amount,
              expense.expense_date,
              expense.receipt_number || null,
              notesWithJob,
              userId
            ]
          );
        }
      }
    }

    // Update job's updated_at timestamp
    await client.query(
      'UPDATE jobs SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [jobId]
    );

    // Get updated materials for response
    const updatedMaterials = await client.query(
      'SELECT * FROM materials_used WHERE job_id = $1 ORDER BY created_at',
      [jobId]
    );

    // Get updated waste for response
    const updatedWaste = await client.query(
      'SELECT * FROM waste_expenses WHERE job_id = $1 ORDER BY created_at',
      [jobId]
    );

    // Get expenses linked to this job (via notes)
    const updatedExpenses = await client.query(
      `SELECT * FROM operational_expenses 
       WHERE notes LIKE $1 
       ORDER BY expense_date DESC`,
      [`%[Job: ${jobTicketId}]%`]
    );

    // Get edit history for response
    const editHistory = await client.query(
      `SELECT meh.*, u.name as editor_name 
       FROM material_edit_history meh 
       LEFT JOIN users u ON meh.edited_by = u.id 
       WHERE meh.job_id = $1 
       ORDER BY meh.edited_at DESC 
       LIMIT 10`,
      [jobId]
    );

    await client.query('COMMIT');

    // Send notification
    try {
      broadcastToAdmins({
        type: 'materials_updated',
        notification: {
          title: 'Job Materials Updated',
          message: `Materials for job ${job.ticket_id} were updated by ${req.user.name}`,
          type: 'materials_updated',
          relatedEntityId: jobId,
          createdAt: new Date()
        }
      });
    } catch (notifyError) {
      console.warn('Notification failed:', notifyError);
    }

    res.json({
      message: 'Materials updated successfully',
      materials: updatedMaterials.rows,
      waste: updatedWaste.rows,
      expenses: updatedExpenses.rows,
      editHistory: editHistory.rows
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update materials error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const deleteJob = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Check if job exists and user has access
    const currentJob = await client.query(
      'SELECT worker_id FROM jobs WHERE id = $1',
      [id]
    );

    if (currentJob.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Only admins can delete jobs
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete related records first
    await client.query('DELETE FROM materials_used WHERE job_id = $1', [id]);
    await client.query('DELETE FROM waste_expenses WHERE job_id = $1', [id]);
    await client.query('DELETE FROM payments WHERE job_id = $1', [id]);
    
    // Delete the job
    await client.query('DELETE FROM jobs WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};