// E:\Hairdresser_matching_service\backend\index.js
const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY is not set!');
    process.exit(1);
}
const stripe = require('stripe')(stripeSecretKey);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.get('/hello', (req, res) => {
    res.send('Hello from Express!');
});

app.post('/create-payment-session', async (req, res) => {
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

const { sendMessage } = require('./services/lineService');

app.post('/send-line-message', async (req, res) => {
    const { userId, message } = req.body;
    if (!userId || !message) {
        return res.status(400).json({ error: 'userId and message are required' });
    }

    await sendMessage(userId, message);
    res.json({ success: true });
});

//  async function to start app
async function startServer() {
    try {
        const db = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'salomo',
        });

        console.log('MySQL connected!');

        // POST /api/request - 施術希望を保存
        app.post('/api/request', async (req, res) => {
            try {
                const { menu, date, time, price, condition, note } = req.body;

                const query = `
                    INSERT INTO service_requests (menu, date, time, price, \`condition\`, note)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                await db.execute(query, [
                    menu, date, time, price, condition || '', note || ''
                ]);

                res.status(200).json({ message: '施術希望が保存されました' });

            } catch (err) {
                console.error('DB Insert Error:', err);
                res.status(500).json({ error: 'Failed to submit request' });
            }
        });

        app.get('/api/requests', async (req, res) => {
            try {
                const [rows] = await db.execute('SELECT * FROM service_requests ORDER BY id DESC');
                res.status(200).json(rows);
            } catch (err) {
                console.error('DB Select Error:', err);
                res.status(500).json({ error: 'Failed to fetch requests' });
            }
        });


        app.post('/api/save-user', async (req, res) => {
            const { line_user_id, name, avatar_url, status_message } = req.body;

            if (!line_user_id || !name) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            try {
                const [existing] = await db.execute(
                    'SELECT id FROM users WHERE line_user_id = ?', [line_user_id]
                );

                if (existing.length > 0) {
                    await db.execute(
                        'UPDATE users SET name = ?, avatar_url = ?, status_message = ? WHERE line_user_id = ?', [name, avatar_url, status_message, line_user_id]
                    );
                } else {
                    await db.execute(
                        'INSERT INTO users (line_user_id, name, avatar_url, status_message) VALUES (?, ?, ?, ?)', [line_user_id, name, avatar_url, status_message]
                    );
                }

                res.status(200).json({ message: 'User saved successfully' });
            } catch (err) {
                console.error('Failed to save user:', err);
                res.status(500).json({ error: 'Database error' });
            }
        });



        // GET /api/suggestions - スタイリスト一覧を返す
        app.get('/api/suggestions', async (req, res) => {
            try {
                const [rows] = await db.query(`
                    SELECT name, avatar_url, rating FROM stylists ORDER BY rating DESC
                `);
                res.status(200).json(rows);
            } catch (err) {
                console.error('DB Select Error:', err);
                res.status(500).json({ error: 'Failed to fetch suggestions' });
            }
        });

        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('MySQL connection failed:', err);
    }
}

startServer();