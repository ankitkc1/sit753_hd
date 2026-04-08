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
  res.render("about", {
    profile: {
      name: "Ankit K C",
      headline: "Played by Maths",
      kicker: "AI Developer | Full-stack Developer | Researcher",
      intro: "Just a human trying to make cool stuff with code and research. I have a passion for building things that people find useful, whether it's a web app, a research paper, or just a neat algorithm. When I'm not coding, you can find me exploring the outdoors, playing chess, or trying to cook something new (with varying success).",
      location: "Melbourne, AU",
      email: "ankitkc908@gmail.com",
      website: "https://your-site.com",
      websiteLabel: "ankitkc1.com.np",
      highlights: ["Python", "LLM/ RAG", "FastAPI", "Node.js", "Vector DB/Search", "MongoDB", "Docker", "Research"]
    },
    stats: [
      { label: "Publications", value: 5, suffix: "+", note: "Peer-reviewed" },
      { label: "Reviewed papers", value: 6, suffix: "+", note: "Journal / conference" },
      { label: "Total citations", value: 27, suffix: "+", note: "Google Scholar" },
      { label: "h-index", value: 4, suffix: "", note: "Current" },
      { label: "Projects shipped", value: 4, suffix: "+", note: "Production builds" },
    ],
    impact: {
      citationGrowth: 68,
      orcid: "0000-0000-0000-0000",
      areas: ["Blockchain", "Health tech", "RAG Systems"],
      lastUpdated: "March 2026"
    },
    skills: [
      {
        group: "AI / ML",
        items: [
          { name: "Python", level: 88, note: "Machine learning and LLM work" },
          { name: "LLMs / RAG", level: 74, note: "Retrieval-based AI systems" },
          { name: "FastAPI", level: 68, note: "AI service APIs" },
          { name: "PostgreSQL / Vector Search", level: 78, note: "Structured + semantic retrieval" },
          { name: "Docker", level: 65, note: "Deployment and reproducibility" }
        ]
      },
      {
        group: "Web Dev",
        items: [
          { name: "HTML/CSS", level: 92, note: "Responsive and accessible UI" },
          { name: "JavaScript", level: 88, note: "Interactive front-end features" },
          { name: "Node.js", level: 86, note: "Express, APIs, auth" }
        ]
      },
      {
        group: "Research",
        items: [
          { name: "Scientific Writing", level: 82, note: "Clear and structured" },
          { name: "Literature Review", level: 84, note: "Finding and organizing key ideas" },
          { name: "Research Thinking", level: 80, note: "Problem solving and hypothesis building" },
          { name: "Data Analysis", level: 65, note: "Interpreting results and trends" }
        ]
      }
    ],
    education: [
      { degree: "Master of Information Technology", school: "Deakin University", years: "2025 — 2027", grade: "High Distinction" },
      { degree: "Bachelor of Technology in Software Engineering", school: "CGU", years: "2020 — 2024", grade: "9.47/10" }
    ]
  });
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