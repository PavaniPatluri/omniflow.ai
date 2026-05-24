const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const prisma = require('../lib/prisma');

// ── Webhook Verification Token from env ───────────────────────────────────────
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;

// ── GET /api/webhooks/whatsapp — Meta Webhook Verification ────────────────────
router.get('/whatsapp', (req, res) => {
  if (!VERIFY_TOKEN) {
    console.error('[Webhook] META_WEBHOOK_VERIFY_TOKEN is not set');
    return res.sendStatus(500);
  }

  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Webhook] ✅ WhatsApp Webhook Verified');
    res.status(200).send(challenge);
  } else {
    console.warn('[Webhook] ⚠️ Verification failed — token mismatch');
    res.sendStatus(403);
  }
});

// ── POST /api/webhooks/whatsapp — Incoming Messages ───────────────────────────
router.post('/whatsapp', async (req, res) => {
  // ── SECURITY: Verify Meta payload signature ────────────────────────────────
  const signature = req.headers['x-hub-signature-256'];
  if (process.env.META_APP_SECRET && signature) {
    const rawBody = JSON.stringify(req.body);
    const expected = 'sha256=' + crypto
      .createHmac('sha256', process.env.META_APP_SECRET)
      .update(rawBody)
      .digest('hex');

    if (signature !== expected) {
      console.warn('[Webhook] ⚠️ Signature mismatch — possible spoofed request');
      return res.sendStatus(403);
    }
  } else if (process.env.NODE_ENV === 'production') {
    // In production, reject if we can't verify
    if (!process.env.META_APP_SECRET) {
      console.error('[Webhook] META_APP_SECRET not set — cannot verify signature');
    }
    if (!signature) {
      console.warn('[Webhook] Missing X-Hub-Signature-256 header');
      return res.sendStatus(401);
    }
  }

  const body = req.body;

  if (body.object !== 'whatsapp_business_account') {
    return res.sendStatus(404);
  }

  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    // Only process if there's an actual inbound text message
    if (!value?.messages?.[0]) {
      return res.sendStatus(200); // Ack delivery receipts etc. silently
    }

    const inboundMsg = value.messages[0];
    if (inboundMsg.type !== 'text') {
      // Acknowledge non-text messages (images, audio, etc.) silently for now
      return res.sendStatus(200);
    }

    const from       = inboundMsg.from;
    const msgBody    = inboundMsg.text.body;
    const senderName = value.contacts?.[0]?.profile?.name || 'WhatsApp User';

    // Derive workspaceId from the phone_number_id mapping (default for MVP)
    const workspaceId = process.env.DEFAULT_WORKSPACE_ID || 'ws-apex-main';

    // 1. Find or Create Lead
    let lead = await prisma.lead.findFirst({ where: { phone: from, workspaceId } });
    if (!lead) {
      lead = await prisma.lead.create({
        data: { name: senderName, phone: from, source: 'WHATSAPP', status: 'NEW', workspaceId }
      });
      console.log(`[Webhook] New lead created: ${lead.id} (${from})`);
    }

    // 2. Find Active Conversation or Create New
    let conv = await prisma.conversation.findFirst({
      where: { leadId: lead.id, channel: 'WHATSAPP', status: { in: ['OPEN', 'PENDING'] } }
    });
    if (!conv) {
      conv = await prisma.conversation.create({
        data: { workspaceId, leadId: lead.id, channel: 'WHATSAPP', status: 'OPEN', priority: false }
      });
    }

    // 3. Save Inbound Message
    const msg = await prisma.message.create({
      data: {
        conversationId: conv.id,
        content: msgBody,
        senderType: 'USER',
        senderName: lead.name
      }
    });

    await prisma.conversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date() }
    });

    // 4. Evaluate Active Workflows
    const workflows = await prisma.workflow.findMany({ where: { workspaceId, isActive: true } });
    const triggered = workflows
      .map(w => ({ ...w, nodes: JSON.parse(w.nodes || '[]') }))
      .filter(w => w.nodes.some(n => n.type === 'trigger' && n.data?.label?.includes('WHATSAPP')));

    if (triggered.length > 0) {
      console.log(`[Workflow] Executing ${triggered.length} workflow(s) for WHATSAPP trigger`);
      // TODO: replace with real workflow execution engine
    }

    // 5. AI Auto-Reply (simulated — replace with Gemini/OpenAI call in production)
    setTimeout(async () => {
      try {
        const aiReply = 'Thank you for contacting us via WhatsApp! Our AI has logged your message and an agent will follow up shortly.';
        await prisma.message.create({
          data: {
            conversationId: conv.id,
            content: aiReply,
            senderType: 'AI',
            senderName: 'OmniFlow AI'
          }
        });
        console.log(`[Webhook] AI reply logged for conversation ${conv.id}`);
        // TODO: send reply via Meta Graph API: POST /v17.0/{phone-number-id}/messages
      } catch (e) {
        console.error('[Webhook] AI reply error:', e.message);
      }
    }, 1500);

    res.sendStatus(200);
  } catch (err) {
    console.error('[Webhook] Processing error:', err.message);
    res.sendStatus(500);
  }
});

module.exports = router;
