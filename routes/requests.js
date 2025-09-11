const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// 顧客ランク一覧
router.get('/customer-ranks', async(req, res) => {
    const db = getPool();
    try {
        const [rows] = await db.execute('SELECT * FROM customer_ranks ORDER BY min_budget DESC');
        res.status(200).json(rows);
    } catch (err) {
        console.error('DB Select Error:', err);
        res.status(500).json({ error: 'Failed to fetch customer ranks' });
    }
});

// 施術希望の投稿（ランク自動判定）
router.post('/request', async(req, res) => {
    const db = getPool();
    try {
        const { menu, date, time, price, area, condition, note, is_model_work, is_wedding, is_photo_shoot, customer_id } = req.body;
        let rank_id;
        if (price >= 8000) rank_id = 1;
        else if (price >= 5000) rank_id = 2;
        else if (price >= 1000) rank_id = 3;
        else rank_id = 4;
        const query = `
			INSERT INTO service_requests (customer_id, rank_id, menu, date, time, price, area, \`condition\`, note, is_model_work, is_wedding, is_photo_shoot)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`;
        console.log(query, 'request data');

        await db.execute(query, [
            customer_id, rank_id, menu, date, time, price, area, condition || '', note || '',
            is_model_work || false, is_wedding || false, is_photo_shoot || false
        ]);
        res.status(200).json({ message: '施術希望が保存されました' });
    } catch (err) {
        console.error('DB Insert Error:', err);
        res.status(500).json({ error: 'Failed to submit request' });
    }
});

// 施術希望一覧（ランク情報付き）
router.get('/requests', async(req, res) => {
    const db = getPool();
    try {
        const [rows] = await db.execute(`
			SELECT sr.*, cr.rank_code, cr.rank_name, cr.commission_rate, cr.is_free,
			       u.name as customer_name, u.avatar_url as customer_avatar
			FROM service_requests sr
			JOIN customer_ranks cr ON sr.rank_id = cr.id
			JOIN users u ON sr.customer_id = u.id
			WHERE sr.status = 'active'
			ORDER BY sr.created_at DESC
		`);
        res.status(200).json(rows);
    } catch (err) {
        console.error('DB Select Error:', err);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

module.exports = router;