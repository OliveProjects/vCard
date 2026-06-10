require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('./db');

async function seed() {
  const hash = await bcrypt.hash('admin123', 10);
  await pool.query(
    'INSERT INTO users (email, password_hash, is_admin) VALUES ($1, $2, true) ON CONFLICT (email) DO NOTHING',
    ['admin@vcard.se', hash]
  );
  const res = await pool.query('SELECT id, email, is_admin FROM users');
  console.log('Användare skapade:', res.rows);
  await pool.end();
}

seed().catch(console.error);
