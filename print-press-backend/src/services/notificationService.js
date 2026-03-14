import { pool } from '../config/database.js';
import emailService from './emailService.js';
import pushService from './pushService.js';

export class NotificationService {
  // Database notification methods - notify all admins
  async createNotification(data) {
    // Get all admin users
    const adminUsers = await pool.query(
      'SELECT id FROM users WHERE role = $1 AND is_active = true',
      ['admin']
    );

    const notificationPromises = adminUsers.rows.map(admin =>
      pool.query(
        `INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id, priority, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          admin.id,
          data.title,
          data.message,
          data.type,
          data.relatedEntityType,
          data.relatedEntityId,
          data.priority || 'medium',
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        ]
      )
    );

    await Promise.all(notificationPromises);

    // Send push notification to all admins
    try {
      await pushService.sendPushToAdmins({
        title: data.title,
        body: data.message,
        tag: `${data.type}-${data.relatedEntityId || Date.now()}`,
        url: data.url || '/admin/notifications'
      });
    } catch (pushErr) {
      console.error('Push notification failed (non-fatal):', pushErr.message);
    }
  }

  // Create notification for a specific user only
  async createUserNotification(userId, data) {
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id, priority, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        data.title,
        data.message,
        data.type,
        data.relatedEntityType || null,
        data.relatedEntityId || null,
        data.priority || 'medium',
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      ]
    );

    // Send push notification to the specific user
    try {
      await pushService.sendPushToUser(userId, {
        title: data.title,
        body: data.message,
        tag: `${data.type}-${data.relatedEntityId || Date.now()}`,
        url: data.url || '/admin/notifications'
      });
    } catch (pushErr) {
      console.error('Push notification failed (non-fatal):', pushErr.message);
    }
  }

  // Create notification for user AND copy to all admins (for worker actions admin should know about)
  async createNotificationWithAdminCopy(userId, data) {
    // First notify the user
    await this.createUserNotification(userId, data);

    // Then notify all admins (except if user is admin)
    const adminUsers = await pool.query(
      'SELECT id FROM users WHERE role = $1 AND is_active = true AND id != $2',
      ['admin', userId]
    );

    const adminNotificationPromises = adminUsers.rows.map(admin =>
      pool.query(
        `INSERT INTO notifications (user_id, title, message, type, related_entity_type, related_entity_id, priority, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          admin.id,
          data.title,
          data.message,
          data.type,
          data.relatedEntityType || null,
          data.relatedEntityId || null,
          data.priority || 'medium',
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        ]
      )
    );

    await Promise.all(adminNotificationPromises);

    // Send push to both the user and all admins
    try {
      await pushService.sendPushToUserAndAdmins(userId, {
        title: data.title,
        body: data.message,
        tag: `${data.type}-${data.relatedEntityId || Date.now()}`,
        url: data.url || '/admin/notifications'
      });
    } catch (pushErr) {
      console.error('Push notification failed (non-fatal):', pushErr.message);
    }
  }


  async getUserNotifications(userId, options = {}) {
    let query = `
      SELECT * FROM notifications 
      WHERE user_id = $1 
    `;

    const params = [userId];

    if (options.unreadOnly) {
      query += ' AND is_read = false';
    }

    query += ' ORDER BY created_at DESC';

    if (options.limit) {
      query += ' LIMIT $2';
      params.push(options.limit);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  async markAsRead(notificationId, userId) {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
  }

  async markAllAsRead(userId) {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );
  }

  async getUnreadCount(userId) {
    const result = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  // Business logic notification methods
  async notifyNewJob(job, worker) {
    // Fetch customer name for the notification
    let customerName = 'a customer';
    try {
      const custResult = await pool.query(
        'SELECT name FROM customers WHERE id = $1',
        [job.customer_id]
      );
      if (custResult.rows.length > 0) customerName = custResult.rows[0].name;
    } catch (e) { /* use default */ }

    const deliveryInfo = job.delivery_deadline
      ? `\nDelivery: ${new Date(job.delivery_deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : '';
    const costInfo = job.total_cost ? `\nTotal Cost: ₦${Number(job.total_cost).toLocaleString()}` : '';

    const title = `New Job: ${job.ticket_id}`;
    const message = `Customer: ${customerName}\nJob: ${job.description || 'No description'}${costInfo}${deliveryInfo}\nCreated by: ${worker.name}`;

    await this.createNotification({
      title,
      message,
      type: 'new_job',
      relatedEntityType: 'job',
      relatedEntityId: job.id,
      priority: 'medium'
    });
  }

  async notifyPaymentUpdate(payment, job, updatedBy) {
    // Fetch customer name
    let customerName = 'Unknown';
    let totalCost = 0;
    let amountPaid = 0;
    let balance = 0;
    try {
      const custResult = await pool.query(
        `SELECT c.name, j.total_cost, 
                COALESCE((SELECT SUM(amount) FROM payments WHERE job_id = j.id), 0) as amount_paid
         FROM jobs j
         JOIN customers c ON j.customer_id = c.id
         WHERE j.id = $1`,
        [payment.job_id]
      );
      if (custResult.rows.length > 0) {
        customerName = custResult.rows[0].name;
        totalCost = Number(custResult.rows[0].total_cost);
        amountPaid = Number(custResult.rows[0].amount_paid);
        balance = totalCost - amountPaid;
      }
    } catch (e) { /* use defaults */ }

    const title = `Payment: ₦${Number(payment.amount).toLocaleString()} — ${job.ticket_id}`;
    const message = `Customer: ${customerName}\nAmount: ₦${Number(payment.amount).toLocaleString()} (${payment.payment_type || 'N/A'})\nMethod: ${payment.payment_method || 'N/A'}\nTotal Paid: ₦${amountPaid.toLocaleString()} / ₦${totalCost.toLocaleString()}\nBalance: ₦${balance.toLocaleString()}\nRecorded by: ${updatedBy.name}`;

    await this.createNotification({
      title,
      message,
      type: 'payment_update',
      relatedEntityType: 'payment',
      relatedEntityId: payment.id,
      priority: 'high'
    });

    // Also send email notification to admin
    const adminResult = await pool.query(
      'SELECT email FROM users WHERE role = $1 AND is_active = true',
      ['admin']
    );

    if (adminResult.rows.length > 0) {
      const adminEmail = adminResult.rows[0].email;

      // Get customer details for email
      const customerResult = await pool.query(
        `SELECT c.name, j.total_cost, j.amount_paid, j.balance 
         FROM jobs j 
         JOIN customers c ON j.customer_id = c.id 
         WHERE j.id = $1`,
        [payment.job_id]
      );

      if (customerResult.rows.length > 0) {
        const customer = customerResult.rows[0];
        await emailService.sendPaymentNotification(
          adminEmail,
          customer.name,
          job.ticket_id,
          payment.amount,
          payment.payment_type,
          customer.amount_paid,
          customer.balance
        );
      }
    }
  }

  async notifyStatusChange(job, oldStatus, newStatus, updatedBy) {
    // Fetch customer name and description
    let customerName = 'Unknown';
    let description = '';
    let deliveryDeadline = null;
    try {
      const custResult = await pool.query(
        `SELECT c.name, j.description, j.delivery_deadline
         FROM jobs j
         JOIN customers c ON j.customer_id = c.id
         WHERE j.id = $1`,
        [job.id]
      );
      if (custResult.rows.length > 0) {
        customerName = custResult.rows[0].name;
        description = custResult.rows[0].description;
        deliveryDeadline = custResult.rows[0].delivery_deadline;
      }
    } catch (e) { /* use defaults */ }

    const statusLabel = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const deliveryInfo = deliveryDeadline
      ? `\nDelivery: ${new Date(deliveryDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : '';

    const title = `Status: ${statusLabel(newStatus)} — ${job.ticket_id}`;
    const message = `Customer: ${customerName}\nJob: ${description || 'No description'}\nStatus: ${statusLabel(oldStatus)} → ${statusLabel(newStatus)}${deliveryInfo}\nUpdated by: ${updatedBy.name}`;

    await this.createNotification({
      title,
      message,
      type: 'status_change',
      relatedEntityType: 'job',
      relatedEntityId: job.id,
      priority: 'medium'
    });

    // Send email to customer if job is completed
    if (newStatus === 'completed') {
      const customerResult = await pool.query(
        `SELECT c.email, c.name, j.description, j.total_cost 
         FROM jobs j 
         JOIN customers c ON j.customer_id = c.id 
         WHERE j.id = $1`,
        [job.id]
      );

      if (customerResult.rows.length > 0 && customerResult.rows[0].email) {
        const customer = customerResult.rows[0];
        await emailService.sendJobCompletionNotification(
          customer.email,
          customer.name,
          job.ticket_id,
          customer.description,
          customer.total_cost
        );
      }
    }
  }

  async notifyLowStock(inventory) {
    const title = 'Low Stock Alert';
    const message = `${inventory.material_name} is running low. Current stock: ${inventory.current_stock} ${inventory.unit_of_measure}`;

    await this.createNotification({
      title,
      message,
      type: 'low_stock',
      relatedEntityType: 'inventory',
      relatedEntityId: inventory.id,
      priority: 'high'
    });

    // Send email alert to admin
    const adminResult = await pool.query(
      'SELECT email FROM users WHERE role = $1 AND is_active = true',
      ['admin']
    );

    if (adminResult.rows.length > 0) {
      const adminEmail = adminResult.rows[0].email;
      await emailService.sendLowStockAlert(
        adminEmail,
        inventory.material_name,
        inventory.current_stock,
        inventory.threshold,
        inventory.unit_of_measure,
        inventory.unit_cost
      );
    }
  }

  async sendMonthlyReport(month, year, financialData, jobStats) {
    const adminResult = await pool.query(
      'SELECT email FROM users WHERE role = $1 AND is_active = true',
      ['admin']
    );

    if (adminResult.rows.length > 0) {
      const adminEmail = adminResult.rows[0].email;

      await emailService.sendMonthlyReport(
        adminEmail,
        month,
        year,
        financialData.revenue,
        financialData.expenses,
        financialData.profit,
        jobStats
      );
    }
  }
}

// Export a default instance
export default new NotificationService();