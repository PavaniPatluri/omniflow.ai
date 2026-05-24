const express = require('express');
const router = express.Router();

// Mock Stripe Subscriptions database
let subscriptionState = {
  planName: 'FREE',
  status: 'ACTIVE',
  stripeId: 'sub_1O...demo',
  billingCycle: 'MONTHLY',
  currentPeriodStart: new Date().toISOString(),
  currentPeriodEnd: new Date(Date.now() + 3600000 * 24 * 30).toISOString(),
  usageLimitChats: 500,
  usageUsedChats: 112,
  usageLimitVoice: 30,
  usageUsedVoice: 12
};

// Checkout Session simulation
router.post('/checkout', (req, res) => {
  const { planName, billingCycle } = req.body;
  if (!planName) {
    return res.status(400).json({ error: 'Plan tier identifier is required' });
  }

  // Define usage quotas based on tier selection
  let usageLimitChats = 500;
  let usageLimitVoice = 30;

  if (planName === 'STARTER') {
    usageLimitChats = 5000;
    usageLimitVoice = 300;
  } else if (planName === 'PRO') {
    usageLimitChats = 50000;
    usageLimitVoice = 2000;
  } else if (planName === 'ENTERPRISE') {
    usageLimitChats = 999999;
    usageLimitVoice = 999999;
  }

  subscriptionState = {
    planName,
    status: 'ACTIVE',
    stripeId: `sub_${Math.random().toString(36).substring(2, 12)}`,
    billingCycle: billingCycle || 'MONTHLY',
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 3600000 * 24 * 30).toISOString(),
    usageLimitChats,
    usageUsedChats: 0,
    usageLimitVoice,
    usageUsedVoice: 0
  };

  res.json({
    message: 'Stripe subscription checkout session successfully initiated',
    checkoutUrl: `https://checkout.stripe.com/pay/${subscriptionState.stripeId}`,
    subscription: subscriptionState
  });
});

// Fetch current subscription status and quotas
router.get('/subscription', (req, res) => {
  res.json({ subscription: subscriptionState });
});

// Cancel subscription
router.post('/cancel', (req, res) => {
  subscriptionState.status = 'CANCELLED';
  res.json({
    message: 'Subscription has been configured to expire at the end of the current billing cycle.',
    subscription: subscriptionState
  });
});

// Stripe Webhook handler simulation
router.post('/webhook', (req, res) => {
  const { type, data } = req.body;
  
  if (type === 'invoice.paid') {
    console.log(`Payment confirmed for billing cycle: ${data.object.subscription}`);
  }
  
  res.status(200).json({ received: true });
});

module.exports = router;
