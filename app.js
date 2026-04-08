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

// locals
app.use((req, res, next) => {
  res.locals.path = req.path;
  res.locals.activePage = '';
  next();
});

// routes
app.get("/", (req, res) => {
  res.render("main", {
    streamlitUrl: process.env.STREAMLIT_URL || "https://m5thmmx6jbrrmb9ytxhqhm.streamlit.app"
  });
});

app.get('/project', (req, res) => res.render('project.ejs', { activePage: 'project' }));
app.get('/research', (req, res) => res.render('research.ejs', { activePage: 'research' }));
app.get('/contact', (req, res) => res.render('contact.ejs', { activePage: 'contact' }));

app.get("/about", (req, res) => {
  const aboutData = require('./data/about.js');
  res.render("about", aboutData);
});

app.get('/download-resume', (req, res) => {
  res.download('./public/resume.pdf');
});

app.use('/blogs', blogRoutes);
app.use('/onlyankit', adminRoutes);
app.use((req, res) => res.status(404).send('Not found'));

const PORT = 3500;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

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

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('MongoDB connection failed:', err);
  }
}

startServer();