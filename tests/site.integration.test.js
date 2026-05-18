process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/site-integration-test';

const { URLSearchParams } = require('url');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const mongoose = require('mongoose');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

const app = require('../app');
const AdminUser = require('../models/AdminUser');
const Blog = require('../models/blog');

let mongoServer;
const createdUploadFiles = [];

function createBlog(overrides = {}) {
  return Blog.create({
    title: 'Integration Blog',
    slug: 'integration-blog',
    excerpt: 'Useful integration coverage.',
    contentHtml: '<p>This is a test blog post for integration testing.</p>',
    categories: ['devops'],
    published: true,
    ...overrides
  });
}

function formBody(fields) {
  const params = new URLSearchParams();

  Object.entries(fields).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      return;
    }

    params.append(key, value);
  });

  return params.toString();
}

function postForm(agent, path, fields) {
  return agent
    .post(path)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .send(formBody(fields));
}

async function createAdmin(password = 'correct-password') {
  const passwordHash = await bcrypt.hash(password, 12);

  return AdminUser.create({
    username: 'onlyankit',
    passwordHash
  });
}

async function loginAsAdmin(agent, password = 'correct-password') {
  await createAdmin(password);

  await postForm(agent, '/onlyankit/login', {
    username: 'onlyankit',
    password
  })
    .expect(302)
    .expect('Location', '/onlyankit');
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Promise.all([AdminUser.init(), Blog.init()]);
});

afterEach(async () => {
  createdUploadFiles.splice(0).forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  await Promise.all([
    AdminUser.deleteMany({}),
    Blog.deleteMany({})
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Public site integration gates', () => {
  test('renders key static pages and returns a real 404 for unknown routes', async () => {
    await request(app).get('/').expect(200);
    await request(app).get('/about').expect(200);
    await request(app).get('/project').expect(200);
    await request(app).get('/research').expect(200);
    await request(app).get('/contact').expect(200);
    await request(app).get('/jenkins').expect(404);
    await request(app).get('/contacted').expect(404);
  });
});

describe('Blog public integration gates', () => {
  test('lists only published blogs and builds categories from published content', async () => {
    await createBlog({
      title: 'Jenkins Pipeline',
      slug: 'jenkins-pipeline',
      excerpt: 'Jenkins delivery notes',
      categories: ['devops']
    });
    await createBlog({
      title: 'AI Research Notes',
      slug: 'ai-research-notes',
      excerpt: 'Research notes',
      categories: ['ai']
    });
    await createBlog({
      title: 'Private Draft',
      slug: 'private-draft',
      excerpt: 'Should never be public',
      categories: ['secret'],
      published: false
    });

    const response = await request(app).get('/blogs').expect(200);

    expect(response.text).toContain('Jenkins Pipeline');
    expect(response.text).toContain('AI Research Notes');
    expect(response.text).not.toContain('Private Draft');
    expect(response.text).toContain('devops');
    expect(response.text).toContain('ai');
    expect(response.text).not.toContain('secret');
  });

  test('filters by category and search text while preserving A-Z sort order', async () => {
    await createBlog({
      title: 'Zebra Jenkins Notes',
      slug: 'zebra-jenkins-notes',
      excerpt: 'Pipeline automation',
      categories: ['devops']
    });
    await createBlog({
      title: 'Alpha Jenkins Guide',
      slug: 'alpha-jenkins-guide',
      excerpt: 'Pipeline automation',
      categories: ['devops']
    });
    await createBlog({
      title: 'AI Deployment',
      slug: 'ai-deployment',
      excerpt: 'Pipeline automation',
      categories: ['ai']
    });

    const response = await request(app)
      .get('/blogs?category=DEVOPS&q=jenkins&sort=az')
      .expect(200);

    expect(response.text).toContain('Alpha Jenkins Guide');
    expect(response.text).toContain('Zebra Jenkins Notes');
    expect(response.text).not.toContain('AI Deployment');
    expect(response.text.indexOf('Alpha Jenkins Guide')).toBeLessThan(
      response.text.indexOf('Zebra Jenkins Notes')
    );
  });

  test('shows related posts by shared category and never exposes drafts', async () => {
    await createBlog({
      title: 'Main DevOps Post',
      slug: 'main-devops-post',
      categories: ['devops']
    });
    await createBlog({
      title: 'Shared Related Post',
      slug: 'shared-related-post',
      categories: ['devops']
    });
    await createBlog({
      title: 'Unpublished Related Draft',
      slug: 'unpublished-related-draft',
      categories: ['devops'],
      published: false
    });
    await createBlog({
      title: 'Unrelated AI Post',
      slug: 'unrelated-ai-post',
      categories: ['ai']
    });

    const response = await request(app).get('/blogs/main-devops-post').expect(200);

    expect(response.text).toContain('Main DevOps Post');
    expect(response.text).toContain('Shared Related Post');
    expect(response.text).not.toContain('Unpublished Related Draft');
    expect(response.text).not.toContain('Unrelated AI Post');
  });

  test('returns a not-found blog page for unknown or unpublished slugs', async () => {
    await createBlog({
      title: 'Hidden Draft',
      slug: 'hidden-draft',
      published: false
    });

    await request(app).get('/blogs/not-real').expect(404);
    await request(app).get('/blogs/hidden-draft').expect(404);
  });
});

describe('Admin CMS integration gates', () => {
  test('protects the dashboard and rejects invalid credentials', async () => {
    await createAdmin();

    await request(app)
      .get('/onlyankit')
      .expect(302)
      .expect('Location', '/onlyankit/login');

    await postForm(request(app), '/onlyankit/login', {
      username: 'onlyankit',
      password: 'wrong-password'
    })
      .expect(200);
  });

  test('keeps an admin session after login and clears it on logout', async () => {
    const agent = request.agent(app);

    await loginAsAdmin(agent);

    await agent.get('/onlyankit').expect(200);

    await agent.post('/onlyankit/logout').expect(302);

    await agent
      .get('/onlyankit')
      .expect(302)
      .expect('Location', '/onlyankit/login');
  });

  test('creates a sanitized published blog from the admin form', async () => {
    const agent = request.agent(app);
    await loginAsAdmin(agent);

    await postForm(agent, '/onlyankit/new', {
      title: 'Unsafe CMS Post',
      excerpt: 'Created through the protected CMS route.',
      contentHtml: '<h1>Allowed</h1><script>alert(1)</script><img src="https://unsplash.com/car.jpg" onerror="alert(1)"><a href="javascript:alert(1)">bad link</a><a href="https://example.com">good link</a>',
      categories: 'DevOps, AI',
      coverImageUrl: 'https://cdn.example.com/cover.jpg',
      published: ['false', 'true']
    })
      .expect(302)
      .expect('Location', '/onlyankit');

    const blog = await Blog.findOne({ slug: 'unsafe-cms-post' }).lean();

    expect(blog).toBeTruthy();
    expect(blog.title).toBe('Unsafe CMS Post');
    expect(blog.categories).toEqual(['devops', 'ai']);
    expect(blog.coverImageUrl).toBe('https://cdn.example.com/cover.jpg');
    expect(blog.published).toBe(true);
    expect(blog.contentHtml).toContain('<h1>Allowed</h1>');
    expect(blog.contentHtml).toContain('href="https://example.com"');
    expect(blog.contentHtml).not.toMatch(/<script|onerror|javascript:/i);
  });

  test('stores uploaded cover images and saves the public uploads URL', async () => {
    const agent = request.agent(app);
    await loginAsAdmin(agent);

    await agent
      .post('/onlyankit/new')
      .field('title', 'Uploaded Cover Post')
      .field('excerpt', 'Multipart admin create should use multer storage.')
      .field('contentHtml', '<p>Post with uploaded cover.</p>')
      .field('categories', 'Uploads')
      .field('published', 'true')
      .attach('coverImage', Buffer.from([0xff, 0xd8, 0xff, 0xd9]), 'cover.jpg')
      .expect(302)
      .expect('Location', '/onlyankit');

    const blog = await Blog.findOne({ slug: 'uploaded-cover-post' }).lean();
    const uploadedPath = path.join(  __dirname, '..','public', blog.coverImageUrl.replace(/^\//, ''));

    createdUploadFiles.push(uploadedPath);

    expect(blog.coverImageUrl).toMatch(/^\/uploads\/\d+-\d+\.jpg$/);
    expect(fs.existsSync(uploadedPath)).toBe(true);
  });

  test('updates a blog, keeps its existing cover when no replacement is supplied, and supports draft state', async () => {
    const agent = request.agent(app);
    await loginAsAdmin(agent);

    const existingBlog = await createBlog({
      title: 'Original Blog',
      slug: 'original-blog',
      coverImageUrl: '/uploads/original.jpg'
    });

    await postForm(agent, `/onlyankit/edit/${existingBlog._id}`, {
      title: 'Updated Blog',
      excerpt: 'Updated excerpt',
      contentHtml: '<p>Updated content</p>',
      categories: 'Research',
      coverImageUrl: '',
      published: 'false'
    })
      .expect(302);

    const updatedBlog = await Blog.findById(existingBlog._id).lean();

    expect(updatedBlog.title).toBe('Updated Blog');
    expect(updatedBlog.slug).toBe('updated-blog');
    expect(updatedBlog.coverImageUrl).toBe('/uploads/original.jpg');
    expect(updatedBlog.categories).toEqual(['research']);
    expect(updatedBlog.published).toBe(false);
  });

  test('deletes blogs through the method-override admin route', async () => {
    const agent = request.agent(app);
    await loginAsAdmin(agent);

    const blog = await createBlog({
      title: 'Delete Me',
      slug: 'delete-me'
    });

    await agent
      .post(`/onlyankit/delete/${blog._id}?_method=DELETE`)
      .expect(302);
    expect(await Blog.findById(blog._id)).toBeNull();
  });
});
