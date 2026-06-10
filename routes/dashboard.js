const express  = require('express')
const router   = express.Router()
const multer   = require('multer')
const path     = require('path')
const fs       = require('fs')
const { pool } = require('../db')

const requireLogin = (req, res, next) => {
  if (!req.session.user) return res.redirect('/auth/login')
  next()
}

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../public/uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `user-${req.session.user.id}-${Date.now()}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, allowed.includes(ext))
  }
})

// Show edit form
router.get('/', requireLogin, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM profiles WHERE user_id = $1',
    [req.session.user.id]
  )
  res.render('dashboard', { profile: rows[0] || null, saved: req.query.saved })
})

// Download QR code as PNG
router.get('/qr.png', requireLogin, async (req, res) => {
  const { rows } = await pool.query('SELECT slug FROM profiles WHERE user_id = $1', [req.session.user.id])
  if (!rows.length) return res.status(404).send('Ingen profil')
  const QRCode = require('qrcode')
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
  const buffer = await QRCode.toBuffer(`${baseUrl}/${rows[0].slug}`, { width: 400, margin: 2 })
  res.setHeader('Content-Type', 'image/png')
  res.setHeader('Content-Disposition', `attachment; filename="qr-${rows[0].slug}.png"`)
  res.send(buffer)
})

// Save profile changes
router.post('/save', requireLogin, upload.single('photo'), async (req, res) => {
  let { name, title, company, phone, email, website, linkedin, instagram, twitter, tiktok } = req.body
  const addHttps = url => url && !/^https?:\/\//i.test(url) ? `https://${url}` : url
  website   = addHttps(website)
  linkedin  = addHttps(linkedin)
  instagram = addHttps(instagram)
  twitter   = addHttps(twitter)
  tiktok    = addHttps(tiktok)
  const userId = req.session.user.id

  const existing = await pool.query('SELECT id, photo_url FROM profiles WHERE user_id = $1', [userId])

  // If a new photo was uploaded, use it; otherwise keep the existing one
  let photo_url = existing.rows[0]?.photo_url || null
  if (req.file) {
    // Delete old photo from disk if it was a local upload
    if (photo_url && photo_url.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '../public', photo_url)
      fs.unlink(oldPath, () => {})
    }
    photo_url = `/uploads/${req.file.filename}`
  }

  if (existing.rows.length) {
    await pool.query(`
      UPDATE profiles SET
        name=$1, title=$2, company=$3, phone=$4, email=$5,
        website=$6, linkedin=$7, photo_url=$8,
        instagram=$9, twitter=$10, tiktok=$11, updated_at=NOW()
      WHERE user_id=$12`,
      [name, title, company, phone, email, website, linkedin, photo_url, instagram, twitter, tiktok, userId]
    )
  } else {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    await pool.query(`
      INSERT INTO profiles (user_id, slug, name, title, company, phone, email, website, linkedin, photo_url, instagram, twitter, tiktok)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [userId, slug, name, title, company, phone, email, website, linkedin, photo_url, instagram, twitter, tiktok]
    )
  }

  res.redirect('/dashboard?saved=1')
})

// Delete own account (GDPR)
router.post('/delete-account', requireLogin, async (req, res) => {
  const userId = req.session.user.id
  try {
    const profile = await pool.query('SELECT photo_url FROM profiles WHERE user_id = $1', [userId])
    if (profile.rows[0]?.photo_url?.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '../public', profile.rows[0].photo_url)
      fs.unlink(filePath, () => {})
    }
    await pool.query('DELETE FROM users WHERE id = $1', [userId])
    req.session.destroy()
    res.redirect('/?deleted=1')
  } catch (err) {
    console.error(err)
    res.redirect('/dashboard?error=1')
  }
})

module.exports = router
