require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const studentRoutes = require('./routes/studentRoutes');

const app = express();
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/StudentDB';
const port = Number(process.env.PORT) || 3000;

if (!process.env.SESSION_SECRET || (!process.env.ADMIN_PASSWORD && !process.env.ADMIN_PASSWORD_HASH)) {
  console.warn('Set SESSION_SECRET and administrator credentials in .env before deployment.');
}
if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || !process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD)) {
  throw new Error('Production requires SESSION_SECRET, ADMIN_USERNAME, and ADMIN_PASSWORD_HASH; remove ADMIN_PASSWORD.');
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  name: 'student-record.sid',
  secret: process.env.SESSION_SECRET || 'development-only-change-me',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: mongoUri, collectionName: 'sessions', ttl: 2 * 60 * 60 }),
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 2 * 60 * 60 * 1000 }
}));
app.use((req, res, next) => {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  res.locals.isAdmin = Boolean(req.session.isAdmin);
  res.locals.username = req.session.username || '';
  res.locals.csrfToken = req.session.csrfToken;
  res.locals.notice = req.query.notice || '';
  res.locals.error = req.query.error || '';
  next();
});
app.use((req, res, next) => {
  if (req.method !== 'POST') return next();
  const expected = Buffer.from(req.session.csrfToken || '');
  const supplied = Buffer.from(String(req.body._csrf || ''));
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
    return res.status(403).render('error', { message: 'This form expired or could not be verified. Reload the page and try again.' });
  }
  next();
});
app.use('/', studentRoutes);
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).render('error', {
    message: mongoose.connection.readyState === 1
      ? 'Something went wrong while loading the student records.'
      : 'MongoDB is not connected. Check MONGO_URI and start MongoDB.'
  });
});

connectDB().then(() => {
  app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
});

