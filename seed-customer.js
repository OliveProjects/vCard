require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('./db');

async function seed() {
  const hash = await bcrypt.hash('test123', 10);
  const userRes = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id',
    ['kristoffer@test.se', hash]
  );

  if (!userRes.rows.length) {
    console.log('Användaren finns redan.');
    await pool.end();
    return;
  }

  await pool.query(
    'INSERT INTO profiles (user_id, slug, name, title, company, phone, email) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [userRes.rows[0].id, 'kristoffer', 'Kristoffer', 'Grundare & VD', 'Vårt Företag AB', '+46701234567', 'kristoffer@test.se']
  );

  console.log('Testkund skapad!');
  console.log('  Profil: http://localhost:3000/kristoffer');
  console.log('  Login:  kristoffer@test.se / test123');
  await pool.end();
}

seed().catch(console.error);
