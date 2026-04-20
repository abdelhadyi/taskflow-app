const request = require('supertest');
const app     = require('../src/index');

describe('API Gateway', () => {
  describe('GET /health', () => {
    it('should return 200 with ok status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('api-gateway');
    });
  });

  describe('Auth middleware', () => {
    it('should return 401 when no token provided on protected route', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(401);
    });

    it('should return 401 for invalid token', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });

    it('should allow POST /api/users/register without token', async () => {
      // Will get 502 (service not running) but not 401
      const res = await request(app)
        .post('/api/users/register')
        .send({ email: 'test@test.com', password: '123456' });
      expect(res.status).not.toBe(401);
    });

    it('should allow POST /api/users/login without token', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'test@test.com', password: '123456' });
      expect(res.status).not.toBe(401);
    });
  });

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const jwt  = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: 1, email: 'test@test.com', role: 'user' },
        'taskflow-secret-key'
      );
      const res = await request(app)
        .get('/api/unknown-service')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
