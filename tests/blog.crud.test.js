const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Blog = require('../models/blog');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Blog.init();
});

afterEach(async () => {
  await Blog.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Blog CRUD model tests', () => {
  test('creates, retrieves, updates and deletes a blog post', async () => {
    const createdBlog = await Blog.create({
      title: 'Jenkins Pipeline Blog',
      slug: 'jenkins-pipeline-blog',
      excerpt: 'Jenkins is the best devops pipeline tool',
      contentHtml: '<p>This is a test blog post about Jenkins pipelines.</p>',
      categories: ['devops'],
      published: true
    });

    expect(createdBlog._id).toBeDefined();

    const retrievedBlog = await Blog.findOne({
      slug: 'jenkins-pipeline-blog'
    });

    expect(retrievedBlog.title).toBe('Jenkins Pipeline Blog');

    const updatedBlog = await Blog.findByIdAndUpdate(
      createdBlog._id,
      { title: 'Updated Jenkins Pipeline Blog' },
      { returnDocument: 'after' }
    );

    expect(updatedBlog.title).toBe('Updated Jenkins Pipeline Blog');

    await Blog.findByIdAndDelete(createdBlog._id);

    const deletedBlog = await Blog.findById(createdBlog._id);

    expect(deletedBlog).toBeNull();
  });

  test('does not create a blog without required contentHtml', async () => {
    await expect(
      Blog.create({
        title: 'Invalid Blog',
        slug: 'invalid-blog'
      })
    ).rejects.toThrow();
  });

  test('normalizes categories and defaults new blogs to published', async () => {
    const blog = await Blog.create({
      title: 'Category Normalization',
      slug: 'category-normalization',
      contentHtml: '<p>Model defaults should be predictable.</p>',
      categories: ['DevOps', 'AI']
    });

    expect(blog.categories).toEqual(['devops', 'ai']);
    expect(blog.published).toBe(true);
  });

  test('rejects duplicate slugs so public URLs stay unique', async () => {
    await Blog.create({
      title: 'Original Slug',
      slug: 'same-slug',
      contentHtml: '<p>This is the first original post conetents.</p>'
    });

    await expect(
      Blog.create({
        title: 'Duplicate Slug',
        slug: 'same-slug',
        contentHtml: '<p>This is the second post with the same slug.</p>'
      })
    ).rejects.toThrow();
  });
});
