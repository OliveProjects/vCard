const express = require('express')
const router  = express.Router()
const { pool } = require('../db')

// Home page
router.get('/', (req, res) => {
  res.render('home')
})

// Public vCard profile page — opened via NFC tap
router.get('/:slug', async (req, res, next) => {
  const { slug } = req.params

  // Ignore non-profile routes
  const reserved = ['auth', 'dashboard', 'admin', 'favicon.ico']
  if (reserved.includes(slug)) return next()

  try {
    const { rows } = await pool.query(
      'SELECT * FROM profiles WHERE slug = $1 AND active = true',
      [slug]
    )
    if (!rows.length) return res.status(404).render('404')
    res.render('profile', { profile: rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).send('Server error')
  }
})

// Download .vcf file
router.get('/:slug/vcard.vcf', async (req, res) => {
  const { slug } = req.params
  try {
    const { rows } = await pool.query(
      'SELECT * FROM profiles WHERE slug = $1 AND active = true',
      [slug]
    )
    if (!rows.length) return res.status(404).send('Not found')

    const p = rows[0]
    const vcf = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      p.name     ? `FN:${p.name}`             : '',
      p.title    ? `TITLE:${p.title}`          : '',
      p.company  ? `ORG:${p.company}`          : '',
      p.phone    ? `TEL;TYPE=CELL:${p.phone}`  : '',
      p.email    ? `EMAIL:${p.email}`           : '',
      p.website  ? `URL:${p.website}`           : '',
      p.linkedin ? `X-SOCIALPROFILE;type=linkedin:${p.linkedin}` : '',
      p.photo_url ? `PHOTO;VALUE=URI:${p.photo_url}` : '',
      'END:VCARD'
    ].filter(Boolean).join('\r\n')

    res.setHeader('Content-Type', 'text/vcard; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${slug}.vcf"`)
    res.send(vcf)
  } catch (err) {
    console.error(err)
    res.status(500).send('Server error')
  }
})

module.exports = router
