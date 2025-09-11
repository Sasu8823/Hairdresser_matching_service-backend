const express = require('express');
const router = express.Router();

router.get('/hello', (req, res) => {
    res.send('Hello from Express!');
});

router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

module.exports = router;