import { pool } from "../config/database.js";

export class ReportsController {
  // Get dashboard statistics summary - FIXED VERSION
  async getDashboardStatistics(req, res) {
    try {
      console.log("📊 Fetching dashboard statistics...");

      // Get period from query, default to 'all'
      const { period = "all" } = req.query;
      const currentDate = new Date();
      let startDate;
      // End date is always "now" (end of today)
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59, 999);

      // Determine the start date based on the period
      switch (period) {
        case "day":
          startDate = new Date();
          startDate.setDate(currentDate.getDate() - 1);
          break;
        case "week":
          startDate = new Date();
          startDate.setDate(currentDate.getDate() - 7);
          break;
        case "year":
          startDate = new Date(currentDate.getFullYear(), 0, 1);
          break;
        case "month":
          startDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            1
          );
          break;
        default: // 'all'
          startDate = new Date("1970-01-01");
      }

      // For "new customers this month", we always use the start of the current calendar month
      const startOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );

      // 1. Total Customers
      const totalCustomersQuery = `
      SELECT COUNT(*) as total_customers,
      COUNT(CASE WHEN created_at >= $1 THEN 1 END) as new_customers_this_month
      FROM customers
    `;

      // 2. Jobs Statistics - For revenue, use actual payments received in the period, not job costs
      const jobsStatsQuery = `
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN status = 'not_started' THEN 1 END) as pending_jobs,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_jobs,
        COUNT(CASE WHEN status IN ('completed', 'delivered') THEN 1 END) as completed_jobs,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_jobs,
        COUNT(CASE WHEN payment_status = 'fully_paid' THEN 1 END) as fully_paid_jobs,
        COUNT(CASE WHEN payment_status = 'partially_paid' THEN 1 END) as partially_paid_jobs,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as unpaid_jobs,
        COALESCE(SUM(total_cost), 0) as total_revenue
      FROM jobs
      WHERE created_at BETWEEN $1 AND $2
    `;

      // Separate query for actual revenue (payments received in period) - UPDATED to use BETWEEN
      const actualRevenueQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_revenue
      FROM payments
      WHERE date BETWEEN $1 AND $2
    `;

      // 3. Payments Statistics - UPDATED to use BETWEEN
      const paymentStatsQuery = `
      SELECT
        COALESCE(SUM(amount), 0) as total_collected
      FROM payments
      WHERE date BETWEEN $1 AND $2
    `;

      // NEW: Total jobs cost (ALL TIME - for accurate outstanding calculation)
      const totalJobsCostQuery = `
      SELECT 
        COALESCE(SUM(total_cost), 0) as total_job_costs
      FROM jobs
    `;

      // NEW: Total payments (ALL TIME - for accurate outstanding calculation)
      const allTimePaymentsQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_payments
      FROM payments
    `;

      // 4. Inventory Alerts
      const inventoryAlertsQuery = `
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN current_stock <= threshold * 1.5 AND current_stock > threshold THEN 1 END) as low_stock_items,
        COUNT(CASE WHEN current_stock <= threshold THEN 1 END) as critical_stock_items,
        COALESCE(SUM(current_stock * unit_cost), 0) as total_inventory_value
      FROM inventory
      WHERE is_active = true
    `;

      // 5. Recent Activities (last 6 jobs)
      const recentActivitiesQuery = `
      SELECT 
        j.ticket_id,
        j.description,
        j.status,
        j.total_cost,
        j.amount_paid,
        j.balance,
        j.created_at,
        c.name as customer_name
      FROM jobs j
      LEFT JOIN customers c ON j.customer_id = c.id
      ORDER BY j.created_at DESC
      LIMIT 6
    `;

      // 6. Monthly Revenue Trend (last 6 months) - FIXED: changed from payment_date to date
      const revenueTrendQuery = `
    WITH monthly_payments AS (
        SELECT
            DATE_TRUNC('month', date) as month,
            SUM(amount) as collected
        FROM payments
        WHERE date >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', date)
    )
    SELECT 
        DATE_TRUNC('month', j.created_at) as month,
        COUNT(j.id) as job_count,
        COALESCE(SUM(j.total_cost), 0) as revenue,
        COALESCE(mp.collected, 0) as collected
    FROM jobs j
    LEFT JOIN monthly_payments mp ON DATE_TRUNC('month', j.created_at) = mp.month
    WHERE j.created_at >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', j.created_at), mp.collected
    ORDER BY month DESC
    LIMIT 6
    `;

      // 7. Top Customers by Revenue - REFACTORED FOR PERFORMANCE
      const topCustomersQuery = `
      SELECT 
        c.id,
        c.name,
        c.phone,
        c.email,
        COUNT(DISTINCT j.id) as total_jobs,
        COALESCE(SUM(j.total_cost), 0) as total_spent,
        COALESCE(SUM(p.amount), 0) as total_paid,
        (COALESCE(SUM(j.total_cost), 0) - COALESCE(SUM(p.amount), 0)) as outstanding_balance
      FROM customers c
      LEFT JOIN jobs j ON c.id = j.customer_id AND j.created_at >= $1
      LEFT JOIN payments p ON j.id = p.job_id AND p.date >= $1
      GROUP BY c.id, c.name, c.phone, c.email
      ORDER BY total_paid DESC NULLS LAST
      LIMIT 5
    `;

      console.log(`Executing queries for period: ${period}`, {
        startOfMonth,
        startDate,
        endDate,
      });

      const [
        customersResult,
        jobsResult,
        paymentResult,
        actualRevenueResult,
        inventoryResult,
        activitiesResult,
        trendResult,
        customersRevenueResult,
        totalJobsCostResult,
        allTimePaymentsResult,
      ] = await Promise.all([
        pool.query(totalCustomersQuery, [startOfMonth]),
        pool.query(jobsStatsQuery, [startDate, endDate]),
        pool.query(paymentStatsQuery, [startDate, endDate]),
        pool.query(actualRevenueQuery, [startDate, endDate]),
        pool.query(inventoryAlertsQuery),
        pool.query(recentActivitiesQuery),
        pool.query(revenueTrendQuery),
        pool.query(topCustomersQuery, [startDate]),
        pool.query(totalJobsCostQuery),
        pool.query(allTimePaymentsQuery),
      ]);

      console.log("Query results:", {
        customers: customersResult.rows[0],
        jobs: jobsResult.rows[0],
        payments: paymentResult.rows[0],
        inventory: inventoryResult.rows[0],
        activities: activitiesResult.rows.length,
        trend: trendResult.rows.length,
        topCustomers: customersRevenueResult.rows.length,
      });

      const customersStats = customersResult.rows[0] || {
        total_customers: 0,
        new_customers_this_month: 0,
      };

      const jobsStats = jobsResult.rows[0] || {
        total_jobs: 0,
        pending_jobs: 0,
        active_jobs: 0,
        completed_jobs: 0,
        delivered_jobs: 0,
        fully_paid_jobs: 0,
        partially_paid_jobs: 0,
        unpaid_jobs: 0,
        total_revenue: 0,
      };

      const paymentStatsResult = paymentResult.rows[0] || {
        total_collected: 0,
      };

      const inventoryStats = inventoryResult.rows[0] || {
        total_items: 0,
        low_stock_items: 0,
        critical_stock_items: 0,
        total_inventory_value: 0,
      };

      // Calculate payment stats - Use actual payments received as revenue for the period
      const actualRevenue = parseFloat(
        actualRevenueResult.rows[0]?.total_revenue || 0
      );
      const totalRevenue = actualRevenue; // Use actual payments received, not job costs
      const totalCollected = parseFloat(
        paymentStatsResult.total_collected || 0
      );

      // FIXED: Calculate outstanding from ALL jobs (not period-filtered)
      const totalJobCosts = parseFloat(
        totalJobsCostResult.rows[0]?.total_job_costs || 0
      );
      const allTimePayments = parseFloat(
        allTimePaymentsResult.rows[0]?.total_payments || 0
      );
      const totalOutstanding = Math.max(0, totalJobCosts - allTimePayments);

      const paymentStats = {
        total_revenue: totalRevenue,
        total_collected: totalCollected,
        total_outstanding: totalOutstanding,
        collection_rate:
          totalJobCosts > 0 ? (allTimePayments / totalJobCosts) * 100 : 0,
      };

      // Calculate monthly growth
      const revenueTrend = trendResult.rows || [];
      let monthlyGrowth = 0;
      if (revenueTrend.length >= 2) {
        const currentMonthRevenue = parseFloat(revenueTrend[0]?.revenue || 0);
        const lastMonthRevenue = parseFloat(revenueTrend[1]?.revenue || 0);
        monthlyGrowth =
          lastMonthRevenue > 0
            ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) *
            100
            : currentMonthRevenue > 0
              ? 100
              : 0;
      }

      // Calculate inventory health
      const totalStockItems = parseInt(inventoryStats.total_items || 0);
      const lowStockItems = parseInt(inventoryStats.low_stock_items || 0);
      const inventoryHealth =
        totalStockItems > 0
          ? ((totalStockItems - lowStockItems) / totalStockItems) * 100
          : 100;

      // Calculate customer growth rate safely
      const totalCustomers = parseInt(customersStats.total_customers || 0);
      const newThisMonth = parseInt(
        customersStats.new_customers_this_month || 0
      );
      const customerGrowthRate =
        totalCustomers > 0
          ? (newThisMonth / totalCustomers) * 100
          : newThisMonth > 0
            ? 100
            : 0;

      // Calculate job completion rate safely
      const totalJobs = parseInt(jobsStats.total_jobs || 0);
      const completedJobs = parseInt(jobsStats.completed_jobs || 0);
      const jobCompletionRate =
        totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

      // Prepare top customers with proper formatting
      const topCustomers = (customersRevenueResult.rows || []).map(
        (customer) => ({
          id: customer.id,
          name: customer.name || "Unknown Customer",
          contact_person: customer.contact_person || customer.name || "N/A",
          phone: customer.phone || "N/A",
          email: customer.email || "N/A",
          total_jobs: parseInt(customer.total_jobs || 0),
          total_spent: parseFloat(customer.total_spent || 0),
          total_paid: parseFloat(customer.total_paid || 0),
          outstanding_balance: Math.max(
            0,
            parseFloat(customer.outstanding_balance || 0)
          ),
        })
      );

      const response = {
        summary: {
          timestamp: new Date().toISOString(),
          period: period,
          updated_at: new Date().toISOString(),
        },
        customers: {
          total: totalCustomers,
          new_this_month: newThisMonth,
          growth_rate: parseFloat(customerGrowthRate.toFixed(2)),
        },
        jobs: {
          total: totalJobs,
          pending: parseInt(jobsStats.pending_jobs || 0),
          active: parseInt(jobsStats.active_jobs || 0),
          completed: completedJobs,
          delivered: parseInt(jobsStats.delivered_jobs || 0),
          completion_rate: parseFloat(jobCompletionRate.toFixed(2)),
        },
        payments: {
          total_revenue: parseFloat(paymentStats.total_revenue.toFixed(2)),
          total_collected: parseFloat(paymentStats.total_collected.toFixed(2)),
          total_outstanding: parseFloat(
            paymentStats.total_outstanding.toFixed(2)
          ),
          collection_rate: parseFloat(paymentStats.collection_rate.toFixed(2)),
        },
        inventory: {
          total_items: totalStockItems,
          low_stock: lowStockItems,
          critical_stock: parseInt(inventoryStats.critical_stock_items || 0),
          total_value: parseFloat(
            parseFloat(inventoryStats.total_inventory_value || 0).toFixed(2)
          ),
          alert_level:
            inventoryStats.critical_stock_items > 0
              ? "CRITICAL"
              : inventoryStats.low_stock_items > 0
                ? "WARNING"
                : "HEALTHY",
        },
        recent_activities: activitiesResult.rows || [],
        revenue_trend: revenueTrend.map((trend) => ({
          month: trend.month,
          job_count: parseInt(trend.job_count || 0),
          revenue: parseFloat(trend.revenue || 0),
          collected: parseFloat(trend.collected || 0),
        })),
        top_customers: topCustomers,
        performance_metrics: {
          monthly_revenue_growth: parseFloat(monthlyGrowth.toFixed(2)),
          job_completion_rate: parseFloat(jobCompletionRate.toFixed(2)),
          payment_collection_rate: parseFloat(
            paymentStats.collection_rate.toFixed(2)
          ),
          inventory_health: parseFloat(inventoryHealth.toFixed(2)),
        },
      };

      console.log("✅ Dashboard response prepared successfully");
      res.json(response);
    } catch (error) {
      console.error("❌ Dashboard statistics error:", error);
      console.error("Error stack:", error.stack);

      // Send detailed error for debugging
      res.status(500).json({
        error: "Internal server error",
        message: error.message,
        detail: error.detail || "No additional details",
        hint: "Check SQL queries match your database schema",
      });
    }
  }

  // Get financial summary for date range (similar to Profit & Loss)
  async getFinancialSummary(req, res) {
    try {
      const { start_date, end_date } = req.query;

      // Default to current month if not provided
      const currentDate = new Date();
      const defaultStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const defaultEndDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const startDateStr = start_date || defaultStartDate.toISOString().split("T")[0];
      const endDateStr = end_date || defaultEndDate.toISOString().split("T")[0];


      // Total revenue = Payments actually received (CASH BASIS)
      const revenueQuery = `
        SELECT COALESCE(SUM(amount), 0) as total_revenue
        FROM payments
        WHERE date BETWEEN $1 AND $2
      `;

      // Total invoiced (job costs) for jobs in this period
      const jobsInPeriodQuery = `
        SELECT 
          COALESCE(SUM(j.total_cost), 0) as total_invoiced,
          COALESCE(SUM(j.amount_paid), 0) as payments_for_jobs
        FROM jobs j
        WHERE j.date_requested BETWEEN $1 AND $2
      `;

      // OUTSTANDING = ALL TIME (total owed across ALL jobs, not filtered by date)
      const allTimeOutstandingQuery = `
        SELECT 
          COALESCE(SUM(balance), 0) as total_outstanding
        FROM jobs
        WHERE balance > 0
      `;

      // Total material costs
      const materialCostsQuery = `
        SELECT COALESCE(SUM(mu.total_cost), 0) as material_costs
        FROM materials_used mu
        JOIN jobs j ON mu.job_id = j.id
        WHERE j.date_requested BETWEEN $1 AND $2
      `;

      // Total waste costs
      const wasteCostsQuery = `
        SELECT COALESCE(SUM(total_cost), 0) as waste_costs
        FROM waste_expenses 
        WHERE created_at BETWEEN $1 AND $2
      `;

      // Operational costs
      const operationalCostsQuery = `
        SELECT COALESCE(SUM(amount), 0) as operational_costs
        FROM operational_expenses 
        WHERE expense_date BETWEEN $1 AND $2
      `;

      // Labor costs (from worker salaries)
      const laborCostsQuery = `
        SELECT COALESCE(SUM(
          CASE 
            WHEN u.hourly_rate IS NOT NULL THEN u.hourly_rate * 160 -- Approx monthly hours
            WHEN u.monthly_salary IS NOT NULL THEN u.monthly_salary
            ELSE 0 
          END
        ), 0) as labor_costs
        FROM users u
        WHERE u.role = 'worker' 
        AND u.is_active = true
      `;

      const params = [startDateStr, endDateStr];

      const [revenueResult, jobsResult, outstandingResult, materialResult, wasteResult, operationalResult] =
        await Promise.all([
          pool.query(revenueQuery, params),
          pool.query(jobsInPeriodQuery, params),
          pool.query(allTimeOutstandingQuery), // No date filter!
          pool.query(materialCostsQuery, params),
          pool.query(wasteCostsQuery, params),
          pool.query(operationalCostsQuery, params),
        ]);

      // Labor costs are calculated independently of the date range in the current logic
      const laborResult = await pool.query(laborCostsQuery);

      // Cash basis: Revenue = payments received
      const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue);

      // From jobs in this period - actual invoiced and paid
      const totalInvoiced = parseFloat(jobsResult.rows[0].total_invoiced);
      const paymentsForJobs = parseFloat(jobsResult.rows[0].payments_for_jobs);

      // OUTSTANDING = ALL TIME (not filtered by period)
      const outstandingAmount = parseFloat(outstandingResult.rows[0].total_outstanding);

      const totalMaterialCosts = parseFloat(
        materialResult.rows[0].material_costs
      );
      const totalWasteCosts = parseFloat(wasteResult.rows[0].waste_costs);
      const totalOperationalCosts = parseFloat(
        operationalResult.rows[0].operational_costs
      );
      const totalLaborCosts = parseFloat(laborResult.rows[0].labor_costs);

      // Collection rate based on jobs in period
      const collectionRate = totalInvoiced > 0 ? (paymentsForJobs / totalInvoiced) * 100 : 0;

      // Calculate profits based on cash received (revenue)
      const grossProfit = totalRevenue - totalMaterialCosts;
      const totalExpenses =
        totalWasteCosts + totalOperationalCosts + totalLaborCosts;
      const netProfit = grossProfit - totalExpenses;



      // Get job statistics
      const jobStatsQuery = `
        SELECT 
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_jobs,
          COUNT(CASE WHEN payment_status = 'fully_paid' THEN 1 END) as fully_paid_jobs,
          COALESCE(AVG(total_cost), 0) as average_job_value,
          COALESCE(MAX(total_cost), 0) as highest_job_value
        FROM jobs
        WHERE date_requested BETWEEN $1 AND $2
      `;

      const jobStatsResult = await pool.query(jobStatsQuery, params);

      // Get top performing materials
      const topMaterialsQuery = `
        SELECT 
          mu.material_name,
          SUM(mu.quantity) as total_quantity,
          SUM(mu.total_cost) as total_cost,
          COUNT(DISTINCT j.id) as jobs_count
        FROM materials_used mu
        JOIN jobs j ON mu.job_id = j.id
        WHERE j.date_requested BETWEEN $1 AND $2
        GROUP BY mu.material_name
        ORDER BY total_cost DESC
        LIMIT 10
      `;

      const topMaterialsResult = await pool.query(topMaterialsQuery, params);

      res.json({
        period: {
          start_date: startDateStr,
          end_date: endDateStr,
          days: Math.ceil((new Date(endDateStr) - new Date(startDateStr)) / (1000 * 3600 * 24)) + 1,
        },
        revenue: {
          total_revenue: parseFloat(totalRevenue.toFixed(2)),
          total_material_costs: parseFloat(totalMaterialCosts.toFixed(2)),
          gross_profit: parseFloat(grossProfit.toFixed(2)),
          gross_profit_margin: parseFloat(
            (totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0).toFixed(
              2
            )
          ),
        },
        expenses: {
          material_costs: parseFloat(totalMaterialCosts.toFixed(2)),
          waste_costs: parseFloat(totalWasteCosts.toFixed(2)),
          operational_costs: parseFloat(totalOperationalCosts.toFixed(2)),
          labor_costs: parseFloat(totalLaborCosts.toFixed(2)),
          total_expenses: parseFloat(totalExpenses.toFixed(2)),
        },
        profit: {
          net_profit: parseFloat(netProfit.toFixed(2)),
          profit_margin: parseFloat(
            (totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0).toFixed(2)
          ),
          is_profitable: netProfit > 0,
        },
        cash_flow: {
          total_invoiced: parseFloat(totalInvoiced.toFixed(2)),
          payments_received: parseFloat(totalRevenue.toFixed(2)),
          outstanding_amount: parseFloat(outstandingAmount.toFixed(2)),
          collection_rate: parseFloat(collectionRate.toFixed(2)),
        },
        job_stats: jobStatsResult.rows[0],
        top_materials: topMaterialsResult.rows,
        efficiency_metrics: {
          material_efficiency: parseFloat(
            (totalMaterialCosts > 0
              ? totalRevenue / totalMaterialCosts
              : 0
            ).toFixed(2)
          ),
          waste_percentage: parseFloat(
            (totalMaterialCosts > 0
              ? (totalWasteCosts / totalMaterialCosts) * 100
              : 0
            ).toFixed(2)
          ),
        },
      });
    } catch (error) {
      console.error("Monthly financial summary error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Get profit/loss statement for custom date range
  // Get profit/loss statement for custom date range
  // Get profit/loss statement for custom date range
  async getProfitLossStatement(req, res) {
    try {
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return res
          .status(400)
          .json({ error: "Start date and end date are required" });
      }

      // 1. Jobs in the period with their payment status
      const revenueBreakdownQuery = `
      SELECT 
        j.ticket_id,
        j.description,
        j.total_cost as revenue,
        c.name as customer_name,
        j.date_requested as revenue_date,
        j.status,
        j.amount_paid as payments_received,
        j.balance as outstanding
      FROM jobs j
      LEFT JOIN customers c ON j.customer_id = c.id
      WHERE j.date_requested BETWEEN $1 AND $2
      ORDER BY j.total_cost DESC
    `;

      // Get actual payments received in the period (for revenue calculation - consistent with Financial Summary)
      const paymentsQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_payments
      FROM payments
      WHERE date BETWEEN $1 AND $2
    `;

      // 2. Material Costs: Actual materials used for jobs in the period
      const materialCostsQuery = `
      SELECT 
        'Materials' as category,
        mu.material_name as description,
        mu.total_cost as amount,
        mu.created_at as date,
        j.ticket_id
      FROM materials_used mu
      JOIN jobs j ON mu.job_id = j.id
      WHERE j.date_requested BETWEEN $1 AND $2
      ORDER BY mu.total_cost DESC
    `;

      // 3. Waste Costs
      const wasteCostsQuery = `
      SELECT 
        'Waste' as category,
        we.type || ' - ' || COALESCE(we.description, 'No description') as description,
        we.total_cost as amount,
        we.created_at as date
      FROM waste_expenses we
      WHERE we.created_at BETWEEN $1 AND $2
      ORDER BY we.total_cost DESC
    `;

      // 4. Operational Costs
      const operationalCostsQuery = `
      SELECT 
        'Operational' as category,
        oe.category || ' - ' || oe.description as description,
        oe.amount,
        oe.expense_date as date
      FROM operational_expenses oe
      WHERE oe.expense_date BETWEEN $1 AND $2
      ORDER BY oe.amount DESC
    `;

      // 5. Labor Costs - FIXED VERSION (simpler calculation)
      // Note: In PostgreSQL, subtracting two dates returns an integer (days), not an interval
      const laborCostsQuery = `
      SELECT 
        'Labor' as category,
        u.name as description,
        CASE 
          WHEN u.hourly_rate IS NOT NULL THEN u.hourly_rate * 160 * (($2::date - $1::date)::numeric / 30.0)
          WHEN u.monthly_salary IS NOT NULL THEN u.monthly_salary * (($2::date - $1::date)::numeric / 30.0)
          ELSE 0 
        END as amount,
        $1 as date
      FROM users u
      WHERE u.role = 'worker' 
        AND u.is_active = true
      ORDER BY amount DESC
    `;

      const params = [start_date, end_date];
      // ALL TIME outstanding query (not filtered by date)
      const allTimeOutstandingQuery = `
      SELECT COALESCE(SUM(balance), 0) as total_outstanding
      FROM jobs
      WHERE balance > 0
    `;

      const [
        revenueBreakdownResult,
        paymentsResult,
        allTimeOutstandingResult,
        materialCostsResult,
        wasteCostsResult,
        operationalCostsResult,
        laborCostsResult,
      ] = await Promise.all([
        pool.query(revenueBreakdownQuery, params),
        pool.query(paymentsQuery, params),
        pool.query(allTimeOutstandingQuery), // No date filter!
        pool.query(materialCostsQuery, params),
        pool.query(wasteCostsQuery, params),
        pool.query(operationalCostsQuery, params),
        pool.query(laborCostsQuery, params),
      ]);

      // Total invoiced from jobs in period
      const totalInvoiced = revenueBreakdownResult.rows.reduce(
        (sum, row) => sum + parseFloat(row.revenue || 0),
        0
      );

      // Revenue = actual payments collected in the period (CASH BASIS - consistent with Financial Summary)
      const totalRevenue = parseFloat(paymentsResult.rows[0].total_payments);

      // Outstanding = ALL TIME (total owed across ALL jobs, not just this period)
      const outstandingAmount = parseFloat(allTimeOutstandingResult.rows[0].total_outstanding);

      const totalMaterialCosts = materialCostsResult.rows.reduce(
        (sum, row) => sum + parseFloat(row.amount || 0),
        0
      );

      const totalWasteCosts = wasteCostsResult.rows.reduce(
        (sum, row) => sum + parseFloat(row.amount || 0),
        0
      );

      const totalOperationalCosts = operationalCostsResult.rows.reduce(
        (sum, row) => sum + parseFloat(row.amount || 0),
        0
      );

      const totalLaborCosts = laborCostsResult.rows.reduce(
        (sum, row) => sum + parseFloat(row.amount || 0),
        0
      );

      // Calculate profits based on cash received
      const grossProfit = totalRevenue - totalMaterialCosts;
      const totalOperatingExpenses =
        totalWasteCosts + totalOperationalCosts + totalLaborCosts;
      const netProfit = grossProfit - totalOperatingExpenses;

      // Combine all expenses for breakdown
      const allExpenses = [
        ...materialCostsResult.rows,
        ...wasteCostsResult.rows,
        ...operationalCostsResult.rows,
        ...laborCostsResult.rows,
      ].sort((a, b) => b.amount - a.amount);

      res.json({
        period: {
          start_date,
          end_date,
          days:
            Math.ceil(
              (new Date(end_date) - new Date(start_date)) / (1000 * 3600 * 24)
            ) + 1,
        },
        summary: {
          total_revenue: parseFloat(totalRevenue.toFixed(2)),
          total_invoiced: parseFloat(totalInvoiced.toFixed(2)),
          outstanding_amount: parseFloat(outstandingAmount.toFixed(2)),
          material_costs: parseFloat(totalMaterialCosts.toFixed(2)),
          gross_profit: parseFloat(grossProfit.toFixed(2)),
          gross_profit_margin: parseFloat(
            (totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0).toFixed(
              2
            )
          ),
          total_expenses: parseFloat(totalOperatingExpenses.toFixed(2)),
          net_profit: parseFloat(netProfit.toFixed(2)),
          profit_margin: parseFloat(
            (totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0).toFixed(2)
          ),
        },
        revenue_breakdown: revenueBreakdownResult.rows.map((row) => ({
          ticket_id: row.ticket_id,
          description: row.description,
          revenue: parseFloat(row.revenue || 0),
          customer_name: row.customer_name || "Unknown",
          payment_date: row.revenue_date,
          status: row.status,
          payments_received: parseFloat(row.payments_received || 0),
          outstanding: parseFloat(row.outstanding || 0),
        })),
        expense_breakdown: allExpenses.map((row) => ({
          category: row.category,
          description: row.description,
          amount: parseFloat(row.amount || 0),
          date: row.date,
        })),
      });
    } catch (error) {
      console.error("Profit loss statement error:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        error: "Internal server error",
        details: error.message,
      });
    }
  }

  // Get material monitoring dashboard
  async getMaterialMonitoringDashboard(req, res) {
    try {
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return res
          .status(400)
          .json({ error: "Start date and end date are required" });
      }

      const params = [start_date, end_date];

      // Material usage trends - using date range
      const usageTrendsQuery = `
        SELECT 
          DATE_TRUNC('month', j.date_requested) as period,
          mu.material_name,
          SUM(mu.quantity) as total_quantity,
          SUM(mu.total_cost) as total_cost,
          AVG(mu.unit_cost) as average_unit_cost
        FROM materials_used mu
        JOIN jobs j ON mu.job_id = j.id
        WHERE j.date_requested BETWEEN $1 AND $2
        GROUP BY period, mu.material_name
        ORDER BY period DESC, total_cost DESC
      `;

      // Waste analysis - using date range
      const wasteAnalysisQuery = `
        SELECT 
          we.type,
          we.waste_reason,
          COALESCE(i.material_name, we.description) as material_name,
          COUNT(*) as occurrence_count,
          SUM(we.total_cost) as total_cost,
          AVG(we.total_cost) as average_cost,
          (SUM(we.total_cost) / NULLIF((
            SELECT COALESCE(SUM(total_cost), 1) 
            FROM waste_expenses 
            WHERE created_at BETWEEN $1 AND $2
          ), 0)) * 100 as percentage_of_total
        FROM waste_expenses we
        LEFT JOIN inventory i ON we.material_id = i.id
        WHERE we.created_at BETWEEN $1 AND $2
        GROUP BY we.type, we.waste_reason, i.material_name, we.description
        ORDER BY total_cost DESC
      `;

      // Stock level analysis - not date dependent
      const stockAnalysisQuery = `
        SELECT 
          material_name,
          category,
          current_stock,
          threshold,
          unit_of_measure,
          unit_cost,
          (current_stock * unit_cost) as stock_value,
          CASE 
            WHEN threshold > 0 
            THEN ROUND((current_stock / threshold) * 100, 2)
            ELSE 0 
          END as stock_percentage,
          CASE 
            WHEN current_stock <= threshold THEN 'CRITICAL'
            WHEN current_stock <= threshold * 1.5 THEN 'LOW'
            ELSE 'HEALTHY'
          END as stock_status
        FROM inventory 
        WHERE is_active = true 
        ORDER BY stock_status, stock_percentage ASC
      `;

      // Material cost efficiency - using date range
      const costEfficiencyQuery = `
        SELECT 
          COALESCE(i.material_name, mu.material_name) as material_name,
          COUNT(DISTINCT j.id) as jobs_count,
          SUM(mu.quantity) as total_quantity,
          SUM(mu.total_cost) as total_material_cost,
          AVG(mu.unit_cost) as avg_unit_cost,
          SUM(j.total_cost) as total_job_revenue,
          (SUM(j.total_cost) - SUM(mu.total_cost)) as gross_profit,
          CASE 
            WHEN SUM(mu.total_cost) > 0 
            THEN ((SUM(j.total_cost) - SUM(mu.total_cost)) / SUM(mu.total_cost)) * 100 
            ELSE 0 
          END as return_on_material,
          COUNT(DISTINCT j.customer_id) as unique_customers,
          AVG(j.total_cost) as avg_job_value
        FROM materials_used mu
        JOIN jobs j ON mu.job_id = j.id
        LEFT JOIN inventory i ON mu.material_id = i.id
        WHERE j.date_requested BETWEEN $1 AND $2
          AND j.status = 'completed'
        GROUP BY COALESCE(i.material_name, mu.material_name)
        HAVING SUM(mu.total_cost) > 0
        ORDER BY return_on_material DESC
      `;

      // Get material count separately
      const materialCountQuery = `
        SELECT COUNT(*) as material_count
        FROM inventory 
        WHERE is_active = true
      `;

      // Get total waste cost separately - using date range
      const totalWasteCostQuery = `
        SELECT COALESCE(SUM(total_cost), 0) as total_waste_cost
        FROM waste_expenses 
        WHERE created_at BETWEEN $1 AND $2
      `;

      const [
        usageTrendsResult,
        wasteAnalysisResult,
        stockAnalysisResult,
        costEfficiencyResult,
        materialCountResult,
        totalWasteCostResult,
      ] = await Promise.all([
        pool.query(usageTrendsQuery, params),
        pool.query(wasteAnalysisQuery, params),
        pool.query(stockAnalysisQuery),
        pool.query(costEfficiencyQuery, params),
        pool.query(materialCountQuery),
        pool.query(totalWasteCostQuery, params),
      ]);

      // Calculate accurate material return average
      const validReturns = costEfficiencyResult.rows.filter(
        (row) =>
          !isNaN(row.return_on_material) && isFinite(row.return_on_material)
      );

      const averageMaterialReturn =
        validReturns.length > 0
          ? validReturns.reduce(
            (sum, row) => sum + parseFloat(row.return_on_material),
            0
          ) / validReturns.length
          : 0;

      res.json({
        monitoring_period: `${start_date} to ${end_date}`,
        material_usage_trends: usageTrendsResult.rows.map((row) => ({
          period: row.period,
          material_name: row.material_name,
          total_quantity: parseFloat(row.total_quantity) || 0,
          total_cost: parseFloat(row.total_cost) || 0,
          average_unit_cost: parseFloat(row.average_unit_cost) || 0,
        })),
        waste_analysis: wasteAnalysisResult.rows.map((row) => ({
          type: row.type,
          waste_reason: row.waste_reason || "N/A",
          material_name: row.material_name,
          occurrence_count: parseInt(row.occurrence_count) || 0,
          total_cost: parseFloat(row.total_cost) || 0,
          average_cost: parseFloat(row.average_cost) || 0,
          percentage_of_total: parseFloat(row.percentage_of_total) || 0,
        })),
        stock_levels: stockAnalysisResult.rows.map((row) => ({
          material_name: row.material_name,
          category: row.category,
          current_stock: parseFloat(row.current_stock) || 0,
          threshold: parseFloat(row.threshold) || 0,
          unit_of_measure: row.unit_of_measure,
          unit_cost: parseFloat(row.unit_cost) || 0,
          stock_value: parseFloat(row.stock_value) || 0,
          stock_percentage: parseFloat(row.stock_percentage || 0),
          stock_status: row.stock_status || "HEALTHY",
        })),
        cost_efficiency: costEfficiencyResult.rows.map((row) => ({
          material_name: row.material_name,
          jobs_count: parseInt(row.jobs_count) || 0,
          total_quantity: parseFloat(row.total_quantity) || 0,
          total_cost: parseFloat(row.total_material_cost) || 0,
          avg_unit_cost: parseFloat(row.avg_unit_cost) || 0,
          generated_profit: parseFloat(row.gross_profit) || 0,
          return_on_material: parseFloat(row.return_on_material) || 0,
          unique_customers: parseInt(row.unique_customers) || 0,
          avg_job_value: parseFloat(row.avg_job_value) || 0,
        })),
        summary: {
          total_materials_tracked: parseInt(
            materialCountResult.rows[0]?.material_count || 0
          ),
          critical_stock_items: stockAnalysisResult.rows.filter(
            (item) => item.stock_status === "CRITICAL"
          ).length,
          total_waste_cost: parseFloat(
            totalWasteCostResult.rows[0]?.total_waste_cost || 0
          ),
          average_material_return: parseFloat(averageMaterialReturn.toFixed(2)),
        },
      });
    } catch (error) {
      console.error("Material monitoring dashboard error:", error);
      res.status(500).json({
        error: "Internal server error",
        details: error.message,
        hint: "Check database column names match the schema",
      });
    }
  }

  // Get business performance overview
  async getBusinessPerformance(req, res) {
    try {
      const { period = "month" } = req.query;

      const allowedPeriods = ["day", "week", "month", "quarter", "year"];
      if (!allowedPeriods.includes(period)) {
        return res.status(400).json({ error: "Invalid period specified" });
      }

      // Revenue trends based on payments actually received - FIXED
      const revenueTrendsQuery = `
        WITH revenue AS (
          SELECT 
            DATE_TRUNC($1, p.date) as period,
            COALESCE(SUM(p.amount), 0) as total_revenue
          FROM payments p
          WHERE p.date >= CURRENT_DATE - INTERVAL '12 months'
          GROUP BY DATE_TRUNC($1, p.date)
        ),
        jobs AS (
          SELECT
            DATE_TRUNC($1, j.date_requested) as period,
            COUNT(*) as job_count,
            COALESCE(AVG(j.total_cost), 0) as average_job_value
          FROM jobs j
          WHERE j.date_requested >= CURRENT_DATE - INTERVAL '12 months'
          GROUP BY DATE_TRUNC($1, j.date_requested)
        )
        SELECT 
          COALESCE(j.period, r.period) as period,
          COALESCE(j.job_count, 0) as job_count,
          COALESCE(r.total_revenue, 0) as total_revenue,
          COALESCE(r.total_revenue, 0) as collected_revenue,
          COALESCE(j.average_job_value, 0) as average_job_value
        FROM revenue r
        FULL OUTER JOIN jobs j ON j.period = r.period
        ORDER BY period DESC
      `;

      // Customer acquisition trends - FIXED
      const customerTrendsQuery = `
        SELECT 
          DATE_TRUNC($1, first_interaction_date) as period,
          COUNT(*) as new_customers,
          COUNT(CASE WHEN total_jobs_count > 1 THEN 1 END) as repeat_customers
        FROM customers
        WHERE first_interaction_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC($1, first_interaction_date)
        ORDER BY period DESC
      `;

      // Efficiency metrics - FIXED
      const efficiencyMetricsQuery = `
        SELECT 
          DATE_TRUNC($1, j.date_requested) as period,
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN j.status = 'completed' THEN 1 END) as completed_jobs,
          AVG(EXTRACT(EPOCH FROM (j.updated_at - j.created_at)) / 3600) as avg_completion_hours,
          (COUNT(CASE WHEN j.status = 'completed' THEN 1 END)::FLOAT / COUNT(*) * 100) as completion_rate
        FROM jobs j
        WHERE j.date_requested >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC($1, j.date_requested)
        ORDER BY period DESC
      `;

      const [
        revenueTrendsResult,
        customerTrendsResult,
        efficiencyMetricsResult,
      ] = await Promise.all([
        pool.query(revenueTrendsQuery, [period]),
        pool.query(customerTrendsQuery, [period]),
        pool.query(efficiencyMetricsQuery, [period]),
      ]);

      res.json({
        period,
        revenue_trends: revenueTrendsResult.rows,
        customer_trends: customerTrendsResult.rows,
        efficiency_metrics: efficiencyMetricsResult.rows,
        performance_indicators: {
          total_periods: revenueTrendsResult.rows.length,
          average_revenue:
            revenueTrendsResult.rows.length > 0
              ? revenueTrendsResult.rows.reduce(
                (sum, row) => sum + parseFloat(row.total_revenue),
                0
              ) / revenueTrendsResult.rows.length
              : 0,
          customer_growth_rate:
            customerTrendsResult.rows.length > 1
              ? (((customerTrendsResult.rows[0]?.new_customers || 0) -
                (customerTrendsResult.rows[1]?.new_customers || 0)) /
                (customerTrendsResult.rows[1]?.new_customers || 1)) *
              100
              : 0,
        },
      });
    } catch (error) {
      console.error("Business performance error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Export report data
  async exportReportData(req, res) {
    try {
      const { report_type, start_date, end_date } = req.query;

      if (!report_type || !start_date || !end_date) {
        return res
          .status(400)
          .json({
            error:
              "Missing required parameters: report_type, start_date, and end_date are required.",
          });
      }

      let query;
      let filename;

      switch (report_type) {
        case "financial_summary":
          query = `
            SELECT 
              j.ticket_id,
              j.description,
              j.total_cost as revenue,
              j.amount_paid as collected,
              j.balance as outstanding,
              j.status,
              j.payment_status,
              c.name as customer_name,
              j.date_requested,
              j.created_at
            FROM jobs j
            LEFT JOIN customers c ON j.customer_id = c.id
            WHERE j.date_requested BETWEEN $1 AND $2
            ORDER BY j.date_requested DESC
          `;
          filename = `financial_summary_${start_date}_to_${end_date}.csv`;
          break;

        case "material_usage":
          query = `
            SELECT 
              mu.material_name,
              mu.paper_size,
              mu.paper_type,
              mu.grammage,
              mu.quantity,
              mu.unit_cost,
              mu.total_cost,
              j.ticket_id,
              j.description as job_description,
              j.date_requested
            FROM materials_used mu
            JOIN jobs j ON mu.job_id = j.id
            WHERE j.date_requested BETWEEN $1 AND $2
            ORDER BY mu.total_cost DESC
          `;
          filename = `material_usage_${start_date}_to_${end_date}.csv`;
          break;

        case "expenses":
          query = `
            SELECT 
              'Materials' as category,
              mu.material_name as description,
              mu.total_cost as amount,
              mu.created_at as date
            FROM materials_used mu
            JOIN jobs j ON mu.job_id = j.id
            WHERE j.date_requested BETWEEN $1 AND $2
            
            UNION ALL
            
            SELECT 
              'Waste' as category,
              type || ' - ' || description as description,
              total_cost as amount,
              created_at as date
            FROM waste_expenses 
            WHERE created_at BETWEEN $1 AND $2
            
            UNION ALL
            
            SELECT 
              'Operational' as category,
              category || ' - ' || description as description,
              amount,
              expense_date as date
            FROM operational_expenses 
            WHERE expense_date BETWEEN $1 AND $2
            
            ORDER BY amount DESC
          `;
          filename = `expenses_${start_date}_to_${end_date}.csv`;
          break;

        default:
          return res.status(400).json({ error: "Invalid report type" });
      }

      const result = await pool.query(query, [start_date, end_date]);

      // Set headers for CSV download
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      // Convert to CSV
      if (result.rows.length > 0) {
        const headers = Object.keys(result.rows[0]).join(",");
        const rows = result.rows.map((row) =>
          Object.values(row)
            .map((field) => `"${String(field || "").replace(/"/g, '""')}"`)
            .join(",")
        );

        const csv = [headers, ...rows].join("\n");
        res.send(csv);
      } else {
        res.send("No data available for the selected period");
      }
    } catch (error) {
      console.error("Export report error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

export const reportsController = new ReportsController();
