// controllers/workerStatsController.js
import { pool } from '../config/database.js';

export class WorkerStatsController {
    // Get dashboard statistics for a specific worker
    async getWorkerStats(req, res) {
        try {
            const workerId = req.user.userId;

            // Get worker's job statistics
            const jobStatsQuery = `
                SELECT 
                    COUNT(*) as total_jobs,
                    COUNT(CASE WHEN status = 'not_started' THEN 1 END) as pending_jobs,
                    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_jobs,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
                    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_jobs
                FROM jobs
                WHERE worker_id = $1
            `;

            // Get payments collected by this worker (for jobs they worked on)
            const paymentsQuery = `
                SELECT COALESCE(SUM(p.amount), 0) as total_collected
                FROM payments p
                JOIN jobs j ON p.job_id = j.id
                WHERE j.worker_id = $1
            `;

            // Get this month's stats
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
            const monthlyStatsQuery = `
                SELECT 
                    COUNT(*) as jobs_this_month,
                    COALESCE(SUM(j.total_cost), 0) as revenue_this_month
                FROM jobs j
                WHERE j.worker_id = $1 
                AND TO_CHAR(j.created_at, 'YYYY-MM') = $2
            `;

            // Get recent jobs (last 5)
            const recentJobsQuery = `
                SELECT 
                    j.id,
                    j.ticket_id,
                    j.description,
                    j.status,
                    j.total_cost,
                    j.created_at,
                    c.name as customer_name
                FROM jobs j
                LEFT JOIN customers c ON j.customer_id = c.id
                WHERE j.worker_id = $1
                ORDER BY j.created_at DESC
                LIMIT 5
            `;

            // Get worker's recent activity (notifications for them)
            const recentActivityQuery = `
                SELECT 
                    id,
                    title,
                    message,
                    type,
                    is_read,
                    created_at
                FROM notifications
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT 10
            `;

            const [jobStatsResult, paymentsResult, monthlyStatsResult, recentJobsResult, activityResult] =
                await Promise.all([
                    pool.query(jobStatsQuery, [workerId]),
                    pool.query(paymentsQuery, [workerId]),
                    pool.query(monthlyStatsQuery, [workerId, currentMonth]),
                    pool.query(recentJobsQuery, [workerId]),
                    pool.query(recentActivityQuery, [workerId])
                ]);

            const jobStats = jobStatsResult.rows[0] || {
                total_jobs: 0,
                pending_jobs: 0,
                in_progress_jobs: 0,
                completed_jobs: 0,
                delivered_jobs: 0
            };

            const payments = paymentsResult.rows[0] || { total_collected: 0 };
            const monthlyStats = monthlyStatsResult.rows[0] || { jobs_this_month: 0, revenue_this_month: 0 };

            res.json({
                summary: {
                    timestamp: new Date().toISOString(),
                    worker_id: workerId
                },
                jobs: {
                    total: parseInt(jobStats.total_jobs || 0),
                    pending: parseInt(jobStats.pending_jobs || 0),
                    in_progress: parseInt(jobStats.in_progress_jobs || 0),
                    completed: parseInt(jobStats.completed_jobs || 0),
                    delivered: parseInt(jobStats.delivered_jobs || 0),
                    completion_rate: jobStats.total_jobs > 0
                        ? parseFloat(((parseInt(jobStats.completed_jobs) + parseInt(jobStats.delivered_jobs)) / parseInt(jobStats.total_jobs) * 100).toFixed(2))
                        : 0
                },
                payments: {
                    total_collected: parseFloat(payments.total_collected || 0)
                },
                this_month: {
                    jobs: parseInt(monthlyStats.jobs_this_month || 0),
                    revenue: parseFloat(monthlyStats.revenue_this_month || 0)
                },
                recent_jobs: recentJobsResult.rows,
                recent_activity: activityResult.rows
            });
        } catch (error) {
            console.error('Worker stats error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

export const workerStatsController = new WorkerStatsController();
