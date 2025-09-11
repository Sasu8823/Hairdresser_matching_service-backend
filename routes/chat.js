const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// 取得
router.get('/chat/:matching_id', async(req, res) => {
    const db = getPool();
    try {
        const { matching_id } = req.params;
        const [rows] = await db.execute(`
			SELECT cm.*, u.name as sender_name, u.avatar_url as sender_avatar
			FROM chat_messages cm
			JOIN users u ON cm.sender_id = u.id
			WHERE cm.matching_id = ?
			ORDER BY cm.created_at ASC
		`, [matching_id]);
        res.status(200).json(rows);
    } catch (err) {
        console.error('DB Select Error:', err);
        res.status(500).json({ error: 'Failed to fetch chat messages' });
    }
});

// 送信
router.post('/chat/send', async(req, res) => {
    const db = getPool();
    try {
        const { matching_id, sender_id, message, message_type = 'text' } = req.body;
        const [matchingRows] = await db.execute('SELECT * FROM matchings WHERE id = ? AND (customer_id = ? OR stylist_id = ?) AND status = "confirmed"', [matching_id, sender_id, sender_id]);
        if (matchingRows.length === 0) return res.status(403).json({ error: 'Unauthorized or matching not confirmed' });
        const [result] = await db.execute('INSERT INTO chat_messages (matching_id, sender_id, message, message_type) VALUES (?, ?, ?, ?)', [matching_id, sender_id, message, message_type]);
        res.status(200).json({ message: 'Message sent successfully', message_id: result.insertId });
    } catch (err) {
        console.error('DB Insert Error:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// 既読
router.post('/chat/mark-read', async(req, res) => {
    const db = getPool();
    try {
        const { matching_id, user_id } = req.body;
        await db.execute('UPDATE chat_messages SET is_read = TRUE WHERE matching_id = ? AND sender_id != ?', [matching_id, user_id]);
        res.status(200).json({ message: 'Messages marked as read' });
    } catch (err) {
        console.error('DB Update Error:', err);
        res.status(500).json({ error: 'Failed to mark messages as read' });
    }
});

module.exports = router;