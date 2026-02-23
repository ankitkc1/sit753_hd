const express = require('express');
const bcrypt = require('bcryptjs');
const slugify = require('slugify');
const sanitizeHtml = require('sanitize-html');

const AdminUser = require('../models/AdminUser');
const Blog = require('../models/blog');
const requireAdmin = require('../middleware/requireAdmin');
const upload = require('../middleware/upload');

const router = express.Router();

function parsePublished(published) {
  if (Array.isArray(published)) {
    return published.includes('true') || published.includes('on');
  }
  return published === 'true' || published === 'on';
}

function sanitize(content) {
  return sanitizeHtml(content, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt'],
      '*': ['class'],
    },
    allowedSchemes: ['http', 'https', 'data'],
  });
}

// LOGIN
router.get('/login', (req, res) => {
  res.render('admin/login.ejs', { error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await AdminUser.findOne({ username }).lean();
  if (!user) return res.render('admin/login.ejs', { error: 'Invalid login.' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.render('admin/login.ejs', { error: 'Invalid login.' });

  req.session.adminUserId = user._id.toString();
  res.redirect('/onlyankit');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// DASHBOARD
router.get('/', requireAdmin, async (req, res) => {
  const blogs = await Blog.find({}).sort({ createdAt: -1 }).lean();
  res.render('admin/dashboard.ejs', { blogs });
});

// NEW
// NEW (open form)
router.get('/new', requireAdmin, (req, res) => {
  res.render('admin/form.ejs', { mode: 'create', blog: null, error: null });
});
router.post('/new', requireAdmin, upload.single('coverImage'), async (req, res) => {
  try {
    const { title, excerpt, contentHtml, categories, coverImageUrl, published } = req.body;

    const slug = slugify(title, { lower: true, strict: true });
    const cats = (categories || '')
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);

    const clean = sanitize(contentHtml);

    let finalCoverImageUrl = coverImageUrl || '';
    if (req.file) {
      finalCoverImageUrl = '/uploads/' + req.file.filename;
    }

    await Blog.create({
      title,
      slug,
      excerpt,
      contentHtml: clean,
      categories: cats,
      coverImageUrl: finalCoverImageUrl,
      published: parsePublished(published),
    });

    res.redirect('/onlyankit');
  } catch (e) {
    res.render('admin/form.ejs', {
      mode: 'create',
      blog: req.body,
      error: 'Could not create blog. Title/slug may already exist.',
    });
  }
});

// EDIT
// EDIT (open form)
router.get('/edit/:id', requireAdmin, async (req, res) => {
  const blog = await Blog.findById(req.params.id).lean();
  if (!blog) return res.redirect('/onlyankit');
  res.render('admin/form.ejs', { mode: 'edit', blog, error: null });
});

// EDIT (save changes)
router.post('/edit/:id', requireAdmin, upload.single('coverImage'), async (req, res) => {
  try {
    const { title, excerpt, contentHtml, categories, coverImageUrl, published } = req.body;

    const slug = slugify(title, { lower: true, strict: true });
    const cats = (categories || '')
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);

    const clean = sanitize(contentHtml);

    let finalCoverImageUrl = coverImageUrl || '';
    if (req.file) {
      finalCoverImageUrl = '/uploads/' + req.file.filename;
    }

    // keep old image if no new upload/url given
    if (!finalCoverImageUrl) {
      const existingBlog = await Blog.findById(req.params.id).lean();
      finalCoverImageUrl = existingBlog?.coverImageUrl || '';
    }

    await Blog.findByIdAndUpdate(req.params.id, {
      title,
      slug,
      excerpt,
      contentHtml: clean,
      categories: cats,
      coverImageUrl: finalCoverImageUrl,
      published: parsePublished(published),
    });

    res.redirect('/onlyankit');
  } catch (e) {
    res.render('admin/form.ejs', {
      mode: 'edit',
      blog: { ...req.body, _id: req.params.id },
      error: 'Could not update blog.',
    });
  }
});

// DELETE
router.delete('/delete/:id', requireAdmin, async (req, res) => {
  await Blog.findByIdAndDelete(req.params.id);
  res.redirect('/onlyankit');
});

module.exports = router;
