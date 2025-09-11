const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

let pool;
const { DB_HOST = '127.0.0.1', DB_USER = 'root', DB_PASSWORD = '', DB_NAME = 'salomo', DB_CONNECTION_LIMIT = 10, DB_PORT = 3306 } = process.env;

function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            host: DB_HOST,
            port: Number(DB_PORT),
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME,
            connectionLimit: Number(DB_CONNECTION_LIMIT),
            waitForConnections: true,
            queueLimit: 0,
        });
    }
    return pool;
}

async function getConnection() {
    const p = getPool();
    return p.getConnection();
}

module.exports = { getPool, getConnection };