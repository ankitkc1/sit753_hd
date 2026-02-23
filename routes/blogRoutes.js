const express = require('express');
const Blog = require('../models/blog');

const router = express.Router();

router.get('/', async (req, res) => {
  const category = (req.query.category || '').toLowerCase().trim();
  const q = (req.query.q || '').trim();
  const sort = req.query.sort || 'new';

  const filter = { published: true };

  if (category) filter.categories = category;
  if (q) filter.$or = [{ title: new RegExp(q, 'i') }, { excerpt: new RegExp(q, 'i') }];

  const sortMap = {
    new: { createdAt: -1 },
    old: { createdAt: 1 },
    az: { title: 1 },
  };

  const [blogs, categoryAgg] = await Promise.all([
    Blog.find(filter).sort(sortMap[sort] || sortMap.new).lean(),
    Blog.aggregate([
      { $match: { published: true } },
      { $unwind: '$categories' },
      { $group: { _id: '$categories', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const categories = categoryAgg.map((c) => ({ name: c._id, count: c.count }));

  res.render('blogs/index.ejs', {
    activePage: 'blogs',
    blogs,
    categories,
    selectedCategory: category,
    q,
    sort,
  });
});

router.get('/:slug', async (req, res) => {
  const blog = await Blog.findOne({ slug: req.params.slug, published: true }).lean();

  if (!blog) {
    return res.status(404).render('blogs/show.ejs', {
      activePage: 'blogs',
      blog: null,
      relatedBlogs: [],
    });
  }

  // Find related blogs by shared categories (exclude current blog)
  let relatedBlogs = [];
  if (blog.categories && blog.categories.length) {
    relatedBlogs = await Blog.find({
      _id: { $ne: blog._id },
      published: true,
      categories: { $in: blog.categories },
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();
  }

  // Fallback: if no related by category, show latest blogs (excluding current)
  if (!relatedBlogs.length) {
    relatedBlogs = await Blog.find({
      _id: { $ne: blog._id },
      published: true,
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();
  }

  res.render('blogs/show.ejs', {
    activePage: 'blogs',
    blog,
    relatedBlogs,
  });
});

module.exports = router;
