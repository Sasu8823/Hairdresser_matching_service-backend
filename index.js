const express = require('express');
require('dotenv').config({ path: '.env.local' });

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY is not set!');
    process.exit(1);
}
const stripe = require('stripe')(stripeSecretKey);

const app = express();
const PORT = process.env.PORT || 3000;

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    return next();
});

// Stripe webhook must receive raw body BEFORE JSON parser
app.use('/api/stripe-webhook', express.raw({ type: 'application/json' }));

// JSON parser for all other routes
app.use(express.json());

// Health
app.get('/hello', (req, res) => res.send('Hello from Express!'));

// Simple demo checkout (kept)
app.post('/create-payment-session', async(req, res) => {
    try {
        const { amount, currency, description } = req.body;
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: currency || 'jpy',
                    product_data: { name: description || '美容師マッチングサービス' },
                    unit_amount: amount || 1500,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: 'http://localhost:5173/success.html',
            cancel_url: 'http://localhost:5173/main.html',
        });
        res.json({ url: session.url });
    } catch (error) {
        console.error('Stripe error:', error);
        res.status(500).json({ error: 'Failed to create payment session' });
    }
});

// Routers
app.use('/', require('./routes/health'));
app.use('/api', require('./routes/users'));
app.use('/api', require('./routes/requests'));
app.use('/api', require('./routes/offers'));
app.use('/api', require('./routes/matchings'));
app.use('/api', require('./routes/chat'));
app.use('/api', require('./routes/admin'));
app.use('/api', require('./routes/stripe')); // includes /api/stripe-webhook
app.use('/', require('./routes/line')); // /webhook and notifications

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});