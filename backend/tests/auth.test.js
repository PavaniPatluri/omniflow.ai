require('dotenv').config({ path: '.env.test' });
const request = require('supertest');
const { app, server } = require('../src/server');

describe('OmniFlow Auth API Integration Tests', () => {
  it('should deny access when signing in with incorrect credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@omniflow.ai',
        password: 'incorrect_password'
      });
    
    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error');
  });

  it('should authenticate successfully with correct default credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@omniflow.ai',
        password: 'admin123'
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.name).toEqual('Sarah Connor');
  });

  it('should create new admin workspaces successfully upon sign-up', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: `new_admin_${Date.now()}@omniflow.ai`,
        password: 'secure_password_123',
        name: 'John Connor',
        businessName: 'Resistance Networks'
      });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.name).toEqual('John Connor');
  });
});
