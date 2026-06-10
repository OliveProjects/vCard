require('dotenv').config()
const express    = require('express')
const session    = require('express-session')
const pgSession  = require('connect-pg-simple')(session)
const path       = require('path')
const { pool, createTables } = require('./db')

const app = express()

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use(session({
  store: new pgSession({ pool }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
}))

// Make user available in all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null
  next()
})

// Routes
app.use('/',          require('./routes/public'))
app.use('/auth',      require('./routes/auth'))
app.use('/dashboard', require('./routes/dashboard'))
app.use('/admin',     require('./routes/admin'))

const PORT = process.env.PORT || 3000

createTables().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
})
