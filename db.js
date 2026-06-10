const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const createTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      email       VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      is_admin    BOOLEAN DEFAULT false,
      created_at  TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
      slug        VARCHAR(100) UNIQUE NOT NULL,
      name        VARCHAR(255),
      title       VARCHAR(255),
      company     VARCHAR(255),
      phone       VARCHAR(50),
      email       VARCHAR(255),
      website     VARCHAR(255),
      linkedin    VARCHAR(255),
      photo_url   VARCHAR(500),
      active      BOOLEAN DEFAULT true,
      created_at  TIMESTAMP DEFAULT NOW(),
      updated_at  TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS session (
      sid    VARCHAR NOT NULL COLLATE "default",
      sess   JSON NOT NULL,
      expire TIMESTAMP(6) NOT NULL,
      CONSTRAINT session_pkey PRIMARY KEY (sid)
    );

    CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);
  `)
  console.log('Database tables ready')
}

module.exports = { pool, createTables }
