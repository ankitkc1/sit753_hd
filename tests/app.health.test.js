process.env.SESSION_SECRET = 'test-secret';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test-session-db';

const request = require('supertest');
const app = require('../app');

describe('Application health endpoint', () => {
  test('GET /health returns service status', async () => {
    const response = await request(app).get('/health');

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('OK');
    expect(response.body.service).toBe('portfolio-blog-cms');
  });

  test('GET /metrics exposes Prometheus metrics', async () => {
    const response = await request(app).get('/metrics');

    expect(response.statusCode).toBe(200);
    expect(response.text).toContain('http_requests_total');
  });

  test('GET / allows the Streamlit chatbot iframe through CSP', async () => {
    const response = await request(app).get('/');

    expect(response.statusCode).toBe(200);
    expect(response.text).toContain('src="https://m5thmmx6jbrrmb9ytxhqhm.streamlit.app/?embed=true');

    const csp = response.headers['content-security-policy'];
    expect(csp).toContain('frame-src');
    expect(csp).toContain('https://m5thmmx6jbrrmb9ytxhqhm.streamlit.app');
    expect(csp).toContain('https://*.streamlit.app');
    expect(csp).not.toContain('upgrade-insecure-requests');
  });
});
