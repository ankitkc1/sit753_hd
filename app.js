const express = require('express');
const path = require('path');
//const mongoose = require('mongoose');
const dotenv = require('dotenv');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const methodOverride = require('method-override');

dotenv.config();

const blogRoutes = require('./routes/blogRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

const helmet = require('helmet');
const client = require('prom-client');

app.use(helmet());

const register = new client.Registry();

client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

register.registerMetric(httpRequestCounter);

app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestCounter
      .labels(req.method, req.path, String(res.statusCode))
      .inc();
  });
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'portfolio-blog-cms',
    timestamp: new Date().toISOString()
  });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// view + static
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// session (must be before routes)
const sessionOptions = {
  secret: process.env.SESSION_SECRET || 'test-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};

// Use MongoDB session store only outside testing.
// This prevents Jest from hanging because MongoStore keeps a DB connection open.
if (process.env.NODE_ENV !== 'test') {
  sessionOptions.store = MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
  });
}

app.use(session(sessionOptions));

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

module.exports = app;
