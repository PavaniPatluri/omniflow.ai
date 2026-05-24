require('dotenv').config({ path: '.env.test' });
const request = require('supertest');
const { app, server } = require('../src/server');
const prisma = require('../src/lib/prisma');

let authToken = '';

beforeAll(async () => {
  // Signup to get token for stress test
  const res = await request(app).post('/api/auth/signup').send({ 
    email: `stress_${Date.now()}@example.com`, 
    password: 'Password123!',
    name: 'Stress Tester',
    businessName: 'Stress Inc'
  });
  authToken = res.body.token;
});

afterAll(async () => {
  await prisma.$disconnect();
  server.close();
});

describe('Stress Tests', () => {
  // Increase timeout for stress testing
  jest.setTimeout(30000);

  it('Should handle 100 concurrent requests to GET /api/inbox/conversations', async () => {
    const numRequests = 100;
    const promises = [];

    for (let i = 0; i < numRequests; i++) {
      promises.push(
        request(app)
          .get('/api/inbox/conversations')
          .set('Authorization', `Bearer ${authToken}`)
      );
    }

    const responses = await Promise.all(promises);
    
    // Some might fail due to rate limit, but server shouldn't crash
    const successCount = responses.filter(r => r.statusCode === 200).length;
    const rateLimitCount = responses.filter(r => r.statusCode === 429).length;

    console.log(`Stress Test Inbox: ${successCount} Success, ${rateLimitCount} Rate Limited`);
    
    expect(successCount + rateLimitCount).toEqual(numRequests);
  });
  
  it('Should handle concurrent POSTs to simulated RAG', async () => {
    const numRequests = 20; // RAG text matching can be heavier
    const promises = [];

    for (let i = 0; i < numRequests; i++) {
      promises.push(
        request(app)
          .post('/api/ai/rag/test')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ query: 'pricing tier' })
      );
    }

    const responses = await Promise.all(promises);
    
    const successCount = responses.filter(r => r.statusCode === 200).length;
    console.log(`Stress Test RAG: ${successCount} Success`);
    expect(successCount).toBeGreaterThan(0);
  });

});
