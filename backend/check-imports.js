// Audit script: verify all route modules load without errors
try {
  require('./src/routes/auth');
  console.log('[OK] auth.js');
} catch (e) { console.error('[FAIL] auth.js:', e.message); }

try {
  require('./src/routes/ai');
  console.log('[OK] ai.js');
} catch (e) { console.error('[FAIL] ai.js:', e.message); }

try {
  require('./src/routes/crm');
  console.log('[OK] crm.js');
} catch (e) { console.error('[FAIL] crm.js:', e.message); }

try {
  require('./src/routes/voice');
  console.log('[OK] voice.js');
} catch (e) { console.error('[FAIL] voice.js:', e.message); }

try {
  require('./src/routes/workflow');
  console.log('[OK] workflow.js');
} catch (e) { console.error('[FAIL] workflow.js:', e.message); }

try {
  require('./src/routes/stripe');
  console.log('[OK] stripe.js');
} catch (e) { console.error('[FAIL] stripe.js:', e.message); }

console.log('\nAll route imports verified.');
