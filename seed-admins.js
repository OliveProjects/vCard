require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool } = require('./db');

async function seed() {
  const admins = [
    { email: 'kris@vcard.se', password: 'KrisTemp2026' },
    { email: 'lea@vcard.se',  password: 'LeaTemp2026'  }
  ];

  for (const admin of admins) {
    const hash = await bcrypt.hash(admin.password, 10);
    await pool.query(
      'INSERT INTO users (email, password_hash, is_admin) VALUES ($1, $2, true) ON CONFLICT (email) DO NOTHING',
      [admin.email, hash]
    );
    console.log(`${admin.email} — lösenord: ${admin.password}`);
  }

  await pool.end();
}

seed().catch(console.error);
