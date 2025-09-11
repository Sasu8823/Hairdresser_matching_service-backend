const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

router.get('/admin/dashboard', async(req, res) => {
    const db = getPool();
    try {
        const [userCount] = await db.execute('SELECT COUNT(*) as count FROM users');
        const [requestCount] = await db.execute('SELECT COUNT(*) as count FROM service_requests');
        const [matchingCount] = await db.execute('SELECT COUNT(*) as count FROM matchings');
        const [revenueData] = await db.execute(`
			SELECT 
				SUM(CASE WHEN commission_paid = TRUE THEN commission_amount ELSE 0 END) as total_revenue,
				COUNT(CASE WHEN commission_paid = TRUE THEN 1 END) as paid_count,
				COUNT(CASE WHEN commission_paid = FALSE THEN 1 END) as unpaid_count
			FROM matchings
		`);
        const [rankStats] = await db.execute(`
			SELECT cr.rank_code, cr.rank_name, COUNT(sr.id) as count
			FROM customer_ranks cr
			LEFT JOIN service_requests sr ON cr.id = sr.rank_id
			GROUP BY cr.id, cr.rank_code, cr.rank_name
		`);
        res.status(200).json({
            users: userCount[0].count,
            requests: requestCount[0].count,
            matchings: matchingCount[0].count,
            revenue: revenueData[0],
            rankStats: rankStats
        });
    } catch (err) {
        console.error('DB Select Error:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

router.get('/admin/users', async(req, res) => {
    const db = getPool();
    try {
        const [rows] = await db.execute(`
			SELECT u.*, 
				   COUNT(DISTINCT sr.id) as request_count,
				   COUNT(DISTINCT o.id) as offer_count,
				   COUNT(DISTINCT m.id) as matching_count
			FROM users u
			LEFT JOIN service_requests sr ON u.id = sr.customer_id
			LEFT JOIN offers o ON u.id = o.stylist_id
			LEFT JOIN matchings m ON u.id = m.customer_id OR u.id = m.stylist_id
			GROUP BY u.id
			ORDER BY u.created_at DESC
		`);
        res.status(200).json(rows);
    } catch (err) {
        console.error('DB Select Error:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

router.get('/admin/requests', async(req, res) => {
    const db = getPool();
    try {
        const [rows] = await db.execute(`
			SELECT sr.*, cr.rank_code, cr.rank_name, cr.commission_rate, cr.is_free,
			       u.name as customer_name, u.avatar_url as customer_avatar,
			       COUNT(o.id) as offer_count
			FROM service_requests sr
			JOIN customer_ranks cr ON sr.rank_id = cr.id
			JOIN users u ON sr.customer_id = u.id
			LEFT JOIN offers o ON sr.id = o.request_id
			GROUP BY sr.id
			ORDER BY sr.created_at DESC
		`);
        res.status(200).json(rows);
    } catch (err) {
        console.error('DB Select Error:', err);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

router.get('/admin/matchings', async(req, res) => {
    const db = getPool();
    try {
        const [rows] = await db.execute(`
			SELECT m.*, sr.menu, sr.date, sr.time, sr.price, sr.area,
			       cr.rank_code, cr.rank_name, cr.is_free,
			       o.offer_price, o.offer_message,
			       customer.name as customer_name, customer.avatar_url as customer_avatar,
			       stylist.name as stylist_name, stylist.avatar_url as stylist_avatar
			FROM matchings m
			JOIN service_requests sr ON m.request_id = sr.id
			JOIN customer_ranks cr ON sr.rank_id = cr.id
			JOIN offers o ON m.offer_id = o.id
			JOIN users customer ON m.customer_id = customer.id
			JOIN users stylist ON m.stylist_id = stylist.id
			ORDER BY m.matched_at DESC
		`);
        res.status(200).json(rows);
    } catch (err) {
        console.error('DB Select Error:', err);
        res.status(500).json({ error: 'Failed to fetch matchings' });
    }
});

router.get('/admin/payments', async(req, res) => {
    const db = getPool();
    try {
        const [rows] = await db.execute(`
			SELECT ph.*, m.id as matching_id,
			       customer.name as customer_name,
			       stylist.name as stylist_name,
			       sr.menu
			FROM payment_history ph
			JOIN matchings m ON ph.matching_id = m.id
			JOIN users customer ON m.customer_id = customer.id
			JOIN users stylist ON m.stylist_id = stylist.id
			JOIN service_requests sr ON m.request_id = sr.id
			ORDER BY ph.created_at DESC
		`);
        res.status(200).json(rows);
    } catch (err) {
        console.error('DB Select Error:', err);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

module.exports = router;