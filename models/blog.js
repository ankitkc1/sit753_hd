const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    excerpt: { type: String, default: '', trim: true },
    contentHtml: { type: String, required: true }, // store sanitized HTML
    categories: [{ type: String, trim: true, lowercase: true }],
    coverImageUrl: { type: String, default: '' },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Blog', BlogSchema);
