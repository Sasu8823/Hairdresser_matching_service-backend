const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// 成果課金決済セッション作成
router.post('/create-commission-payment', async(req, res) => {
    const db = getPool();
    try {
        const { matching_id, user_id } = req.body;
        const [matchingRows] = await db.execute(`
			SELECT m.*, sr.menu, sr.price, cr.is_free
			FROM matchings m
			JOIN service_requests sr ON m.request_id = sr.id
			JOIN customer_ranks cr ON sr.rank_id = cr.id
			WHERE m.id = ? AND m.customer_id = ? AND m.commission_paid = FALSE
		`, [matching_id, user_id]);
        if (matchingRows.length === 0) return res.status(404).json({ error: 'Matching not found or already paid' });
        const matching = matchingRows[0];
        if (matching.is_free || matching.commission_amount === 0) {
            await db.execute('UPDATE matchings SET commission_paid = TRUE, payment_status = ? WHERE id = ?', ['paid', matching_id]);
            return res.status(200).json({ message: '無料案件のため決済は不要です', payment_required: false });
        }
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'jpy',
                    product_data: { name: `SALOMO成果課金 - ${matching.menu}`, description: `マッチング成立手数料 (ID: ${matching_id})` },
                    unit_amount: matching.commission_amount,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${req.headers.origin}/payment-success?matching_id=${matching_id}`,
            cancel_url: `${req.headers.origin}/payment-cancel?matching_id=${matching_id}`,
            metadata: { matching_id: String(matching_id), user_id: String(user_id) }
        });
        res.json({ url: session.url, payment_required: true, amount: matching.commission_amount });
    } catch (error) {
        console.error('Stripe error:', error);
        res.status(500).json({ error: 'Failed to create payment session' });
    }
});

// Stripe Webhook
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async(req, res) => {
    const db = getPool();
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const matchingId = session.metadata.matching_id;
        try {
            await db.execute('UPDATE matchings SET commission_paid = TRUE, payment_status = ?, stripe_payment_intent_id = ? WHERE id = ?', ['paid', session.payment_intent, matchingId]);
            await db.execute('INSERT INTO payment_history (matching_id, stripe_payment_intent_id, amount, currency, status, payment_method) VALUES (?, ?, ?, ?, ?, ?)', [matchingId, session.payment_intent, session.amount_total, session.currency, 'succeeded', 'card']);
            console.log(`Payment succeeded for matching ${matchingId}`);
        } catch (dbError) {
            console.error('Database error in webhook:', dbError);
        }
    }
    res.json({ received: true });
});

module.exports = router;