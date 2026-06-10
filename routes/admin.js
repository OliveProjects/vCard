const express = require('express')
const router  = express.Router()
const bcrypt  = require('bcrypt')
const { pool } = require('../db')

const requireAdmin = (req, res, next) => {
  if (!req.session.user || !req.session.user.is_admin) return res.redirect('/auth/login')
  next()
}

// Overview — all customers
router.get('/', requireAdmin, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT u.id, u.email, u.created_at, p.name, p.slug, p.active
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    ORDER BY u.created_at DESC
  `)
  res.render('admin', { customers: rows, created: req.query.created })
})

// Create a new customer account
router.post('/create', requireAdmin, async (req, res) => {
  const { email, password, slug, name } = req.body
  const hash = await bcrypt.hash(password, 10)

  try {
    const userRes = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1,$2) RETURNING id',
      [email, hash]
    )
    await pool.query(
      'INSERT INTO profiles (user_id, slug, name) VALUES ($1,$2,$3)',
      [userRes.rows[0].id, slug, name]
    )
    res.redirect('/admin?created=1')
  } catch (err) {
    console.error(err)
    res.redirect('/admin?error=1')
  }
})

// Toggle profile active/inactive
router.post('/toggle/:id', requireAdmin, async (req, res) => {
  await pool.query(
    'UPDATE profiles SET active = NOT active WHERE user_id = $1',
    [req.params.id]
  )
  res.redirect('/admin')
})

// Reset password — generates a new temp password and shows it in admin
router.post('/reset-password/:id', requireAdmin, async (req, res) => {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  const tempPassword = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  const hash = await bcrypt.hash(tempPassword, 10)
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.params.id])
  res.redirect(`/admin?reset=${encodeURIComponent(tempPassword)}&resetId=${req.params.id}`)
})

module.exports = router
