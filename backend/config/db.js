const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const useSsl =
  String(process.env.DB_SSL || '').toLowerCase() === 'true' ||
  String(process.env.DB_SSL || '') === '1';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'eniso_team',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

module.exports = pool;
