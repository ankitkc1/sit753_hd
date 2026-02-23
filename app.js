const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const methodOverride = require('method-override');

dotenv.config();

const blogRoutes = require('./routes/blogRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// view + static
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
// parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// db
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

// sessions (admin auth)
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);


// Make current path usable in EJS if you want (optional)
app.use((req, res, next) => {
  res.locals.path = req.path;
  res.locals.activePage = ''; // your pages set this
  next();
});

// YOUR normal pages
app.get('/', (req, res) => res.render('main.ejs', { activePage: 'main' }));
app.get('/project', (req, res) => res.render('project.ejs', { activePage: 'project' }));
app.get('/research', (req, res) => res.render('research.ejs', { activePage: 'research' }));
app.get('/about', (req, res) => res.render('about.ejs', { activePage: 'about' }));
app.get('/contact', (req, res) => res.render('contact.ejs', { activePage: 'contact' }));

app.get('/download-resume', (req, res) => {
  res.download('./public/resume.pdf');
});

// BLOGS (public)
app.use('/blogs', blogRoutes);

// ADMIN (hidden route)
app.use('/onlyankit', adminRoutes);
app.use((req, res) => res.status(404).send('Not found'));

const PORT = 3500;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
