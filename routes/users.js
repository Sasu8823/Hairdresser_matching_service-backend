const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// LIFFプロフィールの保存
router.post('/save-user', async(req, res) => {
    const db = getPool();
    const { line_user_id, name, avatar_url, status_message } = req.body;
    if (!line_user_id || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const [existing] = await db.execute('SELECT id FROM users WHERE line_user_id = ?', [line_user_id]);
        if (existing.length > 0) {
            await db.execute('UPDATE users SET name = ?, avatar_url = ?, status_message = ? WHERE line_user_id = ?', [name, avatar_url, status_message, line_user_id]);
        } else {
            await db.execute('INSERT INTO users (line_user_id, name, avatar_url, status_message) VALUES (?, ?, ?, ?)', [line_user_id, name, avatar_url, status_message]);
        }
        res.status(200).json({ message: 'User saved successfully' });
    } catch (err) {
        console.error('Failed to save user:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// スタイリスト候補（将来の実装次第）
router.get('/suggestions', async(req, res) => {
    const db = getPool();
    try {
        const [rows] = await db.query('SELECT name, avatar_url, rating FROM stylists ORDER BY rating DESC');
        res.status(200).json(rows);
    } catch (err) {
        console.error('DB Select Error:', err);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
});

module.exports = router;