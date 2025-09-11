const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// オファー送信
router.post('/offer', async(req, res) => {
    const db = getPool();
    try {
        const { request_id, stylist_id, offer_price, offer_message, estimated_duration, location_type, location_address } = req.body;
        const [existing] = await db.execute('SELECT id FROM offers WHERE request_id = ? AND stylist_id = ?', [request_id, stylist_id]);
        if (existing.length > 0) return res.status(400).json({ error: 'Already offered for this request' });
        await db.execute(`
			INSERT INTO offers (request_id, stylist_id, offer_price, offer_message, estimated_duration, location_type, location_address)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`, [request_id, stylist_id, offer_price, offer_message, estimated_duration, location_type, location_address]);
        res.status(200).json({ message: 'オファーを送信しました' });
    } catch (err) {
        console.error('DB Insert Error:', err);
        res.status(500).json({ error: 'Failed to submit offer' });
    }
});

// リクエストに対するオファー一覧
router.get('/offers/:request_id', async(req, res) => {
    const db = getPool();
    try {
        const { request_id } = req.params;
        const [rows] = await db.execute(`
			SELECT o.*, u.name as stylist_name, u.avatar_url as stylist_avatar, u.rating, u.experience_years
			FROM offers o
			JOIN users u ON o.stylist_id = u.id
			WHERE o.request_id = ? AND o.status = 'pending'
			ORDER BY o.created_at DESC
		`, [request_id]);
        res.status(200).json(rows);
    } catch (err) {
        console.error('DB Select Error:', err);
        res.status(500).json({ error: 'Failed to fetch offers' });
    }
});

// 美容師のオファー一覧
router.get('/stylist-offers/:stylist_id', async(req, res) => {
    const db = getPool();
    try {
        const { stylist_id } = req.params;
        const [rows] = await db.execute(`
			SELECT o.*, sr.menu, sr.date, sr.time, sr.price as request_price, sr.area,
			       cr.rank_code, cr.rank_name,
			       u.name as customer_name, u.avatar_url as customer_avatar
			FROM offers o
			JOIN service_requests sr ON o.request_id = sr.id
			JOIN customer_ranks cr ON sr.rank_id = cr.id
			JOIN users u ON sr.customer_id = u.id
			WHERE o.stylist_id = ?
			ORDER BY o.created_at DESC
		`, [stylist_id]);
        res.status(200).json(rows);
    } catch (err) {
        console.error('DB Select Error:', err);
        res.status(500).json({ error: 'Failed to fetch stylist offers' });
    }
});

module.exports = router;