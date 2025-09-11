const express = require('express');
const router = express.Router();
const line = require('@line/bot-sdk');
const { getPool } = require('../db');
const { sendMessage, sendFlexMessage, createWelcomeMessage, createMatchingNotification } = require('../services/lineService');

const lineConfig = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new line.Client(lineConfig);

// Webhook
router.post('/webhook', line.middleware(lineConfig), (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error('Webhook error:', err);
            res.status(500).end();
        });
});

async function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        return Promise.resolve(null);
    }
    const db = getPool();
    const userId = event.source.userId;
    const messageText = event.message.text;
    try {
        const profile = await client.getProfile(userId);
        await db.execute('INSERT INTO users (line_user_id, name, avatar_url, status_message) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), avatar_url = VALUES(avatar_url), status_message = VALUES(status_message)', [userId, profile.displayName, profile.pictureUrl, profile.statusMessage]);
    } catch (err) {
        console.error('Failed to save user profile:', err);
    }
    if (messageText.includes('こんにちは') || messageText.includes('はじめまして')) {
        const welcomeMessage = createWelcomeMessage();
        await sendFlexMessage(userId, 'SALOMOへようこそ！', welcomeMessage.contents);
    } else if (messageText.includes('ヘルプ') || messageText.includes('help')) {
        await sendMessage(userId, 'SALOMOの使い方:\n\n1. 「希望を投稿」で施術希望を投稿\n2. 「施術希望一覧」でオファーを確認\n3. 「マッチング一覧」でマッチング状況を確認\n\n詳細はアプリ内でご確認ください！');
    } else {
        await sendMessage(userId, 'SALOMOへようこそ！\n\n美容師・ネイリスト・アイリストと簡単にマッチングできます。\n\nアプリを開いてサービスをご利用ください！');
    }
    return Promise.resolve(null);
}

// マッチング成立通知
router.post('/send-matching-notification', async(req, res) => {
    const db = getPool();
    try {
        const { customer_id, stylist_id, menu, date, time } = req.body;
        const [customerRows] = await db.execute('SELECT line_user_id, name FROM users WHERE id = ?', [customer_id]);
        const [stylistRows] = await db.execute('SELECT line_user_id, name FROM users WHERE id = ?', [stylist_id]);
        if (customerRows.length > 0 && stylistRows.length > 0) {
            const customer = customerRows[0];
            const stylist = stylistRows[0];
            const notificationMessage = createMatchingNotification(customer.name, stylist.name, menu, date, time);
            await sendFlexMessage(customer.line_user_id, 'マッチング成立！', notificationMessage.contents);
            await sendFlexMessage(stylist.line_user_id, 'マッチング成立！', notificationMessage.contents);
            res.status(200).json({ message: 'Notifications sent successfully' });
        } else {
            res.status(404).json({ error: 'Users not found' });
        }
    } catch (err) {
        console.error('Failed to send matching notification:', err);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

module.exports = router;