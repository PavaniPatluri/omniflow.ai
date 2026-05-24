require('dotenv').config({ path: '.env.test' }); // load test env vars first
const request = require('supertest');
const { app, server } = require('../src/server');
const prisma = require('../src/lib/prisma');

let authToken = '';
let businessId = '';
let workspaceId = '';

beforeAll(async () => {
  // Push prisma schema to test db before running
  // We assume the DB is already pushed via npm script or beforeEach, but let's just clear some tables.
  try {
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.business.deleteMany();
    await prisma.user.deleteMany();
  } catch (err) {
    console.log('Error clearing test DB, it may be empty.');
  }
});

afterAll(async () => {
  await prisma.$disconnect();
  server.close();
});

describe('API Integration Tests', () => {
  
  describe('Auth Flow', () => {
    it('Should sign up a new user', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password123!',
          businessName: 'Test Business'
        });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('businessId');
      
      authToken = res.body.token;
      businessId = res.body.user.businessId;
    });

    it('Should login the user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
    });
  });

  describe('CRM Endpoints', () => {
    let leadId = '';
    
    it('Should fail to create a lead without auth', async () => {
      const res = await request(app).post('/api/crm/leads').send({ name: 'Lead 1', source: 'WEB' });
      expect(res.statusCode).toEqual(401);
    });

    it('Should create a lead with auth', async () => {
      const res = await request(app)
        .post('/api/crm/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'John Test',
          email: 'john@test.com',
          source: 'WEB_CHAT',
          status: 'NEW'
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      leadId = res.body.id;
    });

    it('Should fetch leads', async () => {
      const res = await request(app)
        .get('/api/crm/leads')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.leads.length).toBeGreaterThan(0);
    });
  });

  describe('Inbox Endpoints', () => {
    let conversationId = '';

    // We first need a conversation
    beforeAll(async () => {
      const lead = await prisma.lead.findFirst();
      const workspace = await prisma.workspace.findFirst({ where: { businessId } });
      const conv = await prisma.conversation.create({
        data: {
          workspaceId: workspace.id,
          leadId: lead.id,
          channel: 'WEB_CHAT',
          status: 'OPEN'
        }
      });
      conversationId = conv.id;
    });

    it('Should fetch conversations', async () => {
      const res = await request(app)
        .get('/api/inbox/conversations')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.conversations.length).toBeGreaterThan(0);
    });

    it('Should post a message to a conversation', async () => {
      const res = await request(app)
        .post(`/api/inbox/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Hello this is a test message' });
      expect(res.statusCode).toEqual(201);
      expect(res.body.message.content).toEqual('Hello this is a test message');
    });
  });

});
