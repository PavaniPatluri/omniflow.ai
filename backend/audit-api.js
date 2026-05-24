const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port: 5000, path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5000${path}`, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    }).on('error', reject);
  });
}

async function runAudit() {
  console.log('=== OmniFlow AI Live API Audit ===\n');

  // 1. Health check
  const health = await get('/health');
  console.log(`[${health.body.status === 'healthy' ? 'PASS' : 'FAIL'}] Health Check: ${health.body.status}`);

  // 2. Auth: Login with wrong credentials (should be 401)
  const bad = await post('/api/v1/auth/login', { email: 'hacker@evil.com', password: 'wrongpwd' });
  console.log(`[${bad.status === 401 ? 'PASS' : 'FAIL'}] Auth Rejection (wrong creds): HTTP ${bad.status}`);

  // 3. Auth: Login with correct credentials (should be 200 + token)
  const good = await post('/api/v1/auth/login', { email: 'admin@omniflow.ai', password: 'admin123' });
  const hasToken = good.body.token && good.body.token.length > 10;
  console.log(`[${good.status === 200 && hasToken ? 'PASS' : 'FAIL'}] Auth Login (admin): HTTP ${good.status}, Token: ${hasToken ? 'Present' : 'MISSING'}`);

  // 4. Auth: Signup new user
  const signup = await post('/api/v1/auth/signup', { email: `audit_${Date.now()}@test.com`, password: 'testpass123', name: 'Audit Bot', businessName: 'Audit Corp' });
  console.log(`[${signup.status === 201 ? 'PASS' : 'FAIL'}] Auth Signup: HTTP ${signup.status}`);

  // 5. Forgot password 
  const forgot = await post('/api/v1/auth/forgot-password', { email: 'admin@omniflow.ai' });
  console.log(`[${forgot.status === 200 ? 'PASS' : 'FAIL'}] Forgot Password Email: HTTP ${forgot.status}`);

  // 6. AI RAG Query
  const aiQ = await post('/api/v1/ai/query', { query: 'What are your pricing plans?', conversationId: 'test-c1' });
  console.log(`[${aiQ.status === 200 && aiQ.body.answer ? 'PASS' : 'FAIL'}] AI RAG Query: HTTP ${aiQ.status}, Has answer: ${!!aiQ.body.answer}`);
  console.log(`   └─ Sentiment: ${aiQ.body.sentiment}, Confidence: ${aiQ.body.ragMetadata?.confidenceScore}`);

  // 7. AI Documents list
  const docs = await get('/api/v1/ai/documents');
  console.log(`[${docs.status === 200 ? 'PASS' : 'FAIL'}] Knowledge Base Docs: HTTP ${docs.status}, Count: ${docs.body.documents?.length}`);

  // 8. CRM Leads list
  const leads = await get('/api/v1/crm/leads');
  console.log(`[${leads.status === 200 ? 'PASS' : 'FAIL'}] CRM Leads: HTTP ${leads.status}, Count: ${leads.body.leads?.length}`);

  // 9. CRM Analytics
  const analytics = await get('/api/v1/crm/analytics');
  console.log(`[${analytics.status === 200 ? 'PASS' : 'FAIL'}] CRM Analytics: HTTP ${analytics.status}, Total Leads: ${analytics.body.totalLeads}`);

  // 10. CRM Lead creation
  const newLead = await post('/api/v1/crm/leads', { name: 'Audit Test Lead', source: 'WEB_CHAT', status: 'NEW' });
  console.log(`[${newLead.status === 201 ? 'PASS' : 'FAIL'}] CRM Create Lead: HTTP ${newLead.status}`);

  // 11. Workflow list
  const wf = await get('/api/v1/workflow');
  console.log(`[${wf.status === 200 ? 'PASS' : 'FAIL'}] Workflows List: HTTP ${wf.status}, Count: ${wf.body.workflows?.length}`);

  // 12. Voice call logs
  const calls = await get('/api/v1/voice/logs');
  console.log(`[${calls.status === 200 ? 'PASS' : 'FAIL'}] Voice Call Logs: HTTP ${calls.status}, Count: ${calls.body.logs?.length}`);

  // 13. Stripe subscription status
  const sub = await get('/api/v1/stripe/subscription');
  console.log(`[${sub.status === 200 ? 'PASS' : 'FAIL'}] Stripe Subscription: HTTP ${sub.status}, Plan: ${sub.body.subscription?.planName}`);

  // 14. Invite team member
  const invite = await post('/api/v1/auth/invite', { email: 'newagent@test.com', role: 'SUPPORT_AGENT' });
  console.log(`[${invite.status === 200 ? 'PASS' : 'FAIL'}] Team Invite: HTTP ${invite.status}`);

  console.log('\n=== Audit Complete ===');
}

runAudit().catch(err => {
  console.error('Audit connection failed:', err.message);
  console.error('Ensure the backend server is running on port 5000.');
});
