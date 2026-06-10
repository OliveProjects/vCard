const express = require('express')
const router  = express.Router()
const { pool } = require('../db')

const requireLogin = (req, res, next) => {
  if (!req.session.user) return res.redirect('/auth/login')
  next()
}

// Show edit form
router.get('/', requireLogin, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM profiles WHERE user_id = $1',
    [req.session.user.id]
  )
  res.render('dashboard', { profile: rows[0] || null, saved: req.query.saved })
})

// Save profile changes
router.post('/save', requireLogin, async (req, res) => {
  const { name, title, company, phone, email, website, linkedin, photo_url } = req.body
  const userId = req.session.user.id

  const existing = await pool.query('SELECT id FROM profiles WHERE user_id = $1', [userId])

  if (existing.rows.length) {
    await pool.query(`
      UPDATE profiles SET
        name=$1, title=$2, company=$3, phone=$4, email=$5,
        website=$6, linkedin=$7, photo_url=$8, updated_at=NOW()
      WHERE user_id=$9`,
      [name, title, company, phone, email, website, linkedin, photo_url, userId]
    )
  } else {
    // Create profile with slug derived from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    await pool.query(`
      INSERT INTO profiles (user_id, slug, name, title, company, phone, email, website, linkedin, photo_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [userId, slug, name, title, company, phone, email, website, linkedin, photo_url]
    )
  }

  res.redirect('/dashboard?saved=1')
})

module.exports = router
