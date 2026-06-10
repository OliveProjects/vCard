const express = require('express')
const router  = express.Router()
const bcrypt  = require('bcrypt')
const { pool } = require('../db')

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard')
  res.render('login', { error: null })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    if (!rows.length) return res.render('login', { error: 'Felaktig e-post eller lösenord' })

    const valid = await bcrypt.compare(password, rows[0].password_hash)
    if (!valid) return res.render('login', { error: 'Felaktig e-post eller lösenord' })

    req.session.user = { id: rows[0].id, email: rows[0].email, is_admin: rows[0].is_admin }
    res.redirect(rows[0].is_admin ? '/admin' : '/dashboard')
  } catch (err) {
    console.error(err)
    res.render('login', { error: 'Något gick fel, försök igen' })
  }
})

router.get('/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/')
})

module.exports = router
