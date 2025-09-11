const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// オファー受け入れ→マッチング成立
router.post('/accept-offer', async(req, res) => {
    const db = getPool();
    try {
        const { offer_id, customer_id } = req.body;
        const [offerRows] = await db.execute(`
			SELECT o.*, sr.customer_id as request_customer_id, sr.rank_id, cr.is_free
			FROM offers o
			JOIN service_requests sr ON o.request_id = sr.id
			JOIN customer_ranks cr ON sr.rank_id = cr.id
			WHERE o.id = ? AND o.status = 'pending'
		`, [offer_id]);
        if (offerRows.length === 0) return res.status(404).json({ error: 'Offer not found or already processed' });
        const offer = offerRows[0];
        if (offer.request_customer_id != customer_id) return res.status(403).json({ error: 'Unauthorized' });

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            await conn.execute('UPDATE offers SET status = ? WHERE id = ?', ['accepted', offer_id]);
            await conn.execute('UPDATE offers SET status = ? WHERE request_id = ? AND id != ?', ['rejected', offer.request_id, offer_id]);
            await conn.execute('UPDATE service_requests SET status = ? WHERE id = ?', ['matched', offer.request_id]);
            const commissionAmount = offer.is_free ? 0 : 500;
            const [matchingResult] = await conn.execute(`
				INSERT INTO matchings (request_id, offer_id, customer_id, stylist_id, commission_amount)
				VALUES (?, ?, ?, ?, ?)
			`, [offer.request_id, offer_id, customer_id, offer.stylist_id, commissionAmount]);
            await conn.commit();
            res.status(200).json({ message: 'マッチングが成立しました！', matching_id: matchingResult.insertId, commission_amount: commissionAmount });
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }
    } catch (err) {
        console.error('DB Error:', err);
        res.status(500).json({ error: 'Failed to accept offer' });
    }
});

// マッチング一覧
router.get('/matchings/:user_id', async(req, res) => {
    const db = getPool();
    try {
        const { user_id } = req.params;
        const [rows] = await db.execute(`
			SELECT m.*, sr.menu, sr.date, sr.time, sr.price, sr.area,
			       cr.rank_code, cr.rank_name, cr.is_free,
			       o.offer_price, o.offer_message, o.estimated_duration, o.location_type, o.location_address,
			       customer.name as customer_name, customer.avatar_url as customer_avatar,
			       stylist.name as stylist_name, stylist.avatar_url as stylist_avatar
			FROM matchings m
			JOIN service_requests sr ON m.request_id = sr.id
			JOIN customer_ranks cr ON sr.rank_id = cr.id
			JOIN offers o ON m.offer_id = o.id
			JOIN users customer ON m.customer_id = customer.id
			JOIN users stylist ON m.stylist_id = stylist.id
			WHERE m.customer_id = ? OR m.stylist_id = ?
			ORDER BY m.matched_at DESC
		`, [user_id, user_id]);
        res.status(200).json(rows);
    } catch (err) {
        console.error('DB Select Error:', err);
        res.status(500).json({ error: 'Failed to fetch matchings' });
    }
});

// マッチング確認
router.post('/confirm-matching', async(req, res) => {
    const db = getPool();
    try {
        const { matching_id, user_id } = req.body;
        const [matchingRows] = await db.execute('SELECT * FROM matchings WHERE id = ? AND (customer_id = ? OR stylist_id = ?)', [matching_id, user_id, user_id]);
        if (matchingRows.length === 0) return res.status(404).json({ error: 'Matching not found' });
        await db.execute('UPDATE matchings SET status = ?, confirmed_at = NOW() WHERE id = ?', ['confirmed', matching_id]);
        res.status(200).json({ message: 'マッチングを確認しました' });
    } catch (err) {
        console.error('DB Error:', err);
        res.status(500).json({ error: 'Failed to confirm matching' });
    }
});

module.exports = router;